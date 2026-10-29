import { GENERAL_ID } from "../../../../src/core/omp-chat-view";
import type { UsageReport } from "../../../../src/core/omp-usage";
import type { ConversationItem, FormAnswerMessage, GeneralError, GeneralPhase, ModelChoice, SendMode, ToChatWebview } from "../../omp-chat-protocol";
import { addError, addForm, addPermission, addUserMessage, answerForm, answerPermission, applyUpdate, cancelPermission, emptyTranscript, returnMessage, setSendStatus, settle, start, type Transcript } from "./transcript";

/** What the view knows of one conversation. */
export interface ConversationView {
  transcript: Transcript;
  models: ModelChoice[];
  currentModel?: string;
  /** Grows each time the host asks for the focus in the message field. */
  focusToken: number;
  /** General's process state, when this is General's tab (`generalStatus`). */
  status?: { phase: GeneralPhase; error?: GeneralError; newSession?: boolean };
  /** The text of a message that did not start, put back in the field; `token` tells one return from the next. */
  returned?: { text: string; token: number };
}

export interface ChatState {
  items: ConversationItem[];
  selected: string | undefined;
  conversations: Record<string, ConversationView>;
  /** The Steer|Queue choice of the window, for a message sent while the agent works, in every conversation. */
  sendMode: SendMode;
  /** The usage of the subscription, as the host last sent it (`usage`). */
  usage: UsageView;
  /** The project's GitHub repository (`owner/repo`) the host sent; null without one. */
  githubRepo: string | null;
}

/** What the bar and the dialog of the usage draw: the last report (none before the first), whether a request runs, and why the last one failed. */
export interface UsageView {
  report?: UsageReport;
  fetching: boolean;
  error?: string;
}

export const initialChatState = (): ChatState => ({ items: [], selected: undefined, conversations: {}, sendMode: "steer", usage: { fetching: false }, githubRepo: null });

const fresh = (): ConversationView => ({ transcript: emptyTranscript(), models: [], focusToken: 0 });

function change(state: ChatState, id: string, edit: (view: ConversationView) => ConversationView): ChatState {
  const view = state.conversations[id] ?? fresh();
  return { ...state, conversations: { ...state.conversations, [id]: edit(view) } };
}

/** The tab in view: the one the host chose, or the first when it chose none that is still there. */
export function selectedOf(state: ChatState): string | undefined {
  return state.items.some((item) => item.id === state.selected) ? state.selected : state.items[0]?.id;
}

/** Whether the host sent the same tab again: every field equal. */
function sameItem(a: ConversationItem, b: ConversationItem): boolean {
  const left = Object.entries(a);
  return left.length === Object.keys(b).length && left.every(([key, value]) => (b as unknown as Record<string, unknown>)[key] === value);
}

/** Applies a message of the host. `now` is read once by the caller so the reducer stays pure. */
export function reduce(state: ChatState, message: ToChatWebview, now: number): ChatState {
  switch (message.type) {
    case "reset":
      return { ...initialChatState(), sendMode: state.sendMode, githubRepo: state.githubRepo };
    case "theme":
      return state;
    case "githubRepo":
      return { ...state, githubRepo: message.repo };
    case "sendMode":
      return { ...state, sendMode: message.mode };
    case "usage":
      return { ...state, usage: { fetching: message.fetching, ...(message.report === undefined ? {} : { report: message.report }), ...(message.error === undefined ? {} : { error: message.error }) } };
    case "messageStatus":
      return change(state, message.id, (view) => ({ ...view, transcript: setSendStatus(view.transcript, message.messageId, message.status, message.reason) }));
    case "conversations": {
      const kept: Record<string, ConversationView> = {};
      // An item the host sent again unchanged keeps its identity, so what draws it does not draw it again.
      const items = message.items.map((item) => {
        const before = state.items.find((each) => each.id === item.id);
        return before !== undefined && sameItem(before, item) ? before : item;
      });
      for (const item of items) {
        const view = state.conversations[item.id] ?? fresh();
        const before = state.items.find((each) => each.id === item.id);
        // The agent's turn ended: what was open in the conversation closes.
        kept[item.id] = before?.state === "running" && item.state !== "running" ? { ...view, transcript: settle(view.transcript, now) } : view;
      }
      const unchanged =
        message.selected === state.selected &&
        items.length === state.items.length &&
        Object.keys(kept).length === Object.keys(state.conversations).length &&
        items.every((item, at) => item === state.items[at] && kept[item.id] === state.conversations[item.id]);
      return unchanged ? state : { ...state, items, selected: message.selected, conversations: kept };
    }
    case "conversationStart":
      return change(state, message.id, (view) => ({
        ...view,
        transcript: start(view.transcript, message.first, message.notice, now),
        focusToken: message.focus ? view.focusToken + 1 : view.focusToken,
      }));
    case "conversationUpdate":
      return change(state, message.id, (view) => ({ ...view, transcript: applyUpdate(view.transcript, message.update, now) }));
    case "conversationHistory":
      return change(state, message.id, (view) => ({ ...view, transcript: message.updates.reduce((transcript, update) => applyUpdate(transcript, update, now), view.transcript) }));
    case "formRequest":
      return change(state, message.id, (view) => ({ ...view, transcript: addForm(view.transcript, { requestId: message.requestId, message: message.message, schema: message.schema }, now) }));
    case "permissionRequest":
      return change(state, message.id, (view) => ({ ...view, transcript: addPermission(view.transcript, { requestId: message.requestId, toolCall: message.toolCall, options: message.options }, now) }));
    case "permissionCancelled":
      return change(state, message.id, (view) => ({ ...view, transcript: cancelPermission(view.transcript, message.requestId) }));
    case "generalStatus":
      return change(state, GENERAL_ID, (view) => ({
        ...view,
        status: { phase: message.phase, ...(message.error === undefined ? {} : { error: message.error }), ...(message.newSession === undefined ? {} : { newSession: message.newSession }) },
      }));
    case "conversationCleared":
      return change(state, message.id, (view) => ({ ...view, transcript: emptyTranscript() }));
    case "returnToField":
      if (message.text === "") return state;
      return change(state, message.id, (view) => ({ ...view, transcript: returnMessage(view.transcript, message.text), returned: { text: message.text, token: (view.returned?.token ?? 0) + 1 } }));
    case "models":
      return change(state, message.id, (view) => ({ ...view, models: message.available, ...(message.current === undefined ? {} : { currentModel: message.current }) }));
    case "conversationError":
      return change(state, message.id, (view) => ({ ...view, transcript: addError(view.transcript, message.message, now) }));
  }
}

/** The developer chose a tab: shown at once, before the host confirms. */
export const selectTab = (state: ChatState, id: string): ChatState => (state.items.some((item) => item.id === id) ? { ...state, selected: id } : state);

/** The developer sent a message from the view. */
export const sendMessage = (state: ChatState, id: string, text: string, now: number, messageId: string): ChatState =>
  change(state, id, (view) => ({ ...view, transcript: addUserMessage(view.transcript, text, now, messageId) }));

/** The developer answered a form (or skipped it). */
export const answerFormIn = (state: ChatState, id: string, requestId: string, answer: FormAnswerMessage): ChatState =>
  change(state, id, (view) => ({ ...view, transcript: answerForm(view.transcript, requestId, answer) }));

/** The developer chose an option of a permission request. */
export const answerPermissionIn = (state: ChatState, id: string, requestId: string, optionId: string): ChatState =>
  change(state, id, (view) => ({ ...view, transcript: answerPermission(view.transcript, requestId, optionId) }));

export interface ChatStore {
  get(): ChatState;
  subscribe(listener: () => void): () => void;
  set(next: ChatState): void;
}

export function createChatStore(initial: ChatState = initialChatState()): ChatStore {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    set(next) {
      state = next;
      for (const listener of listeners) listener();
    },
  };
}
