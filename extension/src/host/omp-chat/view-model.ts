import { chatViewState, GENERAL_ID, ompChatVisible, tabAfterClose } from "../../../../src/core/omp-chat-view";
import type { ConversationItem, ConversationRunState, FirstMessage, SendMode, ToChatWebview } from "../../omp-chat-protocol";
import type { ThemeSetting } from "../../webview/theme";
import { parseChatMessage } from "./messages";
import type { ChatViewPort, ConversationTab, Disposable, OmpPrompt, OmpSessionPort, OutgoingMessage, PendingInstruction, SendStatus } from "./ports";
import type { UsageSource } from "./usage";
import { memorySendModeStore, readSendMode, SEND_MODE_KEY, type SendModeStore } from "./send-mode";

/** What the view needs of the editor: the webview and the few things the developer's clicks ask for. `vscode` stays out of the logic. */
export interface ChatSurface {
  /** Posts a message to the webview, when it exists; the model sends everything again when the webview says it is ready. */
  post(message: ToChatWebview): void;
  /** Sets the context key `trama.ompChatVisible`. */
  setVisible(visible: boolean): void;
  /** Shows the view (`trama.ompChatSidebar.focus`), with `preserveFocus` for the jobs. */
  reveal(preserveFocus: boolean): void;
  /** The `trama.theme` setting. */
  theme(): ThemeSetting;
  /** The text of a file the instruction carries, cut to a reasonable size; undefined when it cannot be read. */
  readText(path: string): string | undefined;
  openLink(url: string): void;
}

interface Tab {
  id: string;
  name: string;
  session: OmpSessionPort | undefined;
  /** The agent is in a turn. */
  inTurn: boolean;
  /** The conversation works for Trama (`setWorking`). */
  working: boolean;
  forms: Set<string>;
  /** The permission requests waiting for the developer, with the ids of the options omp offered. */
  permissions: Map<string, string[]>;
  model?: string;
  start: { first?: FirstMessage; notice?: string };
  /** Ask more's instruction, held for the developer's first message: it goes with that message, and the field shows its placeholder until then. */
  instruction?: PendingInstruction;
  subscriptions: Disposable[];
}

/** General's status as the webview draws it (`generalStatus`). */
type GeneralStatus = Omit<Extract<ToChatWebview, { type: "generalStatus" }>, "type">;

const messageOf = (err: unknown): string => (err instanceof Error ? err.message : String(err));

const promptOf = (prompt: OmpPrompt, surface: ChatSurface): FirstMessage => {
  const text = prompt.attachment === undefined ? undefined : surface.readText(prompt.attachment);
  const name = prompt.attachment?.split(/[\\/]/).pop();
  return { text: prompt.text, ...(prompt.attachment === undefined || name === undefined ? {} : { attachment: { name, text: text ?? "" } }) };
};

/**
 * The omp Chat view of one window (`omp-chat` Machine): the tabs of its conversations, General's first when it is there, the one in view, the context key
 * that shows or hides it and the messages with the webview. It implements `ChatViewPort` for the conversations (`conversations.ts`) and for General.
 */
export class ChatViewModel implements ChatViewPort {
  private readonly tabs: Tab[] = [];
  private selected: string | undefined;
  private visible: boolean | undefined;
  private ready = false;
  private readonly stopListeners = new Set<(id: string) => void>();
  private readonly closeListeners = new Set<(id: string) => void>();
  private lastGeneralStatus: GeneralStatus | undefined;
  private readonly clearListeners = new Set<() => void>();
  private readonly installListeners = new Set<() => void>();
  private readonly generalListeners = new Set<(message: OutgoingMessage) => void>();
  /** The Steer|Queue choice of the view: read from the saved value when the view is made, changed by the developer. */
  private sendMode: SendMode;
  /** The run state each tab had at the last list sent: a tab that goes from `running` to another state ended a turn, which asks for the usage. */
  private readonly lastStates = new Map<string, ConversationRunState>();

  /**
   * `inUse`: omp Chat on, not turned off in the user settings (read now). `pending`: the conversations the window has saved and waits to resume, by
   * id (read now), which keep the view like open ones. `folder`: whether the window has a folder open (read now); General lives only in such a window.
   */
  constructor(
    private readonly surface: ChatSurface,
    private readonly inUse: () => boolean,
    private readonly pending: () => readonly string[] = () => [],
    private readonly folder: () => boolean = () => true,
    private readonly sendModes: SendModeStore = memorySendModeStore(),
    private readonly usage?: UsageSource,
  ) {
    this.sendMode = readSendMode(this.sendModes.get(SEND_MODE_KEY));
    this.usage?.onChange(() => this.postUsage());
    this.refresh();
  }

  /** The state of the view now. */
  get state() {
    return chatViewState(this.facts());
  }

  /** `editor.SETTINGS_CHANGED`, or the end of a resume: the context key follows the settings and the conversations. */
  refresh(): void {
    const visible = ompChatVisible(this.facts());
    if (visible === this.visible) return;
    this.visible = visible;
    this.surface.setVisible(visible);
  }

  /** The `trama.theme` setting changed. */
  themeChanged(): void {
    this.surface.post({ type: "theme", setting: this.surface.theme() });
  }

  /** The webview is there (it just loaded, or it is a new one): it gets everything again, and a conversation's history is replayed by its session. */
  webviewReady(): void {
    this.ready = true;
    this.surface.post({ type: "reset" });
    this.surface.post({ type: "theme", setting: this.surface.theme() });
    this.surface.post({ type: "sendMode", mode: this.sendMode });
    this.postConversations();
    if (this.usage !== undefined) this.surface.post(this.usage.message());
    if (this.lastGeneralStatus !== undefined) this.surface.post({ type: "generalStatus", ...this.lastGeneralStatus });
    for (const tab of this.tabs) {
      this.surface.post({ type: "conversationStart", id: tab.id, focus: false, ...tab.start });
      this.subscribe(tab);
    }
  }

  /** The webview is gone (the view was closed): the next one starts again from `webviewReady`. */
  webviewGone(): void {
    this.ready = false;
    for (const tab of this.tabs) this.unsubscribe(tab);
  }

  open(tab: ConversationTab, session: OmpSessionPort | undefined, options: { focus: boolean; notice?: string; first?: OmpPrompt; instruction?: PendingInstruction }): void {
    const start: Tab["start"] = {
      ...(options.first === undefined ? {} : { first: promptOf(options.first, this.surface) }),
      ...(options.notice === undefined ? {} : { notice: options.notice }),
    };
    const created: Tab = {
      id: tab.id,
      name: tab.name,
      session,
      inTurn: session?.inTurn ?? false,
      working: false,
      forms: new Set(),
      permissions: new Map(),
      start,
      subscriptions: [],
      ...(options.instruction === undefined ? {} : { instruction: options.instruction }),
    };
    this.tabs.push(created);
    this.selected = tab.id;
    this.refresh();
    this.surface.reveal(!options.focus);
    if (!this.ready) return;
    this.postConversations();
    this.surface.post({ type: "conversationStart", id: tab.id, focus: options.focus, ...start });
    if (session !== undefined) this.subscribe(created);
  }

  /** The session of the conversation `id`, once its process started: its tab stops showing the start and follows the session. */
  setSession(id: string, session: OmpSessionPort): void {
    const tab = this.find(id);
    if (tab === undefined) return;
    tab.session = session;
    tab.inTurn = session.inTurn;
    this.postConversations();
    this.subscribe(tab);
  }

  /** General comes to the view as its first tab; it takes the view only when none is in view. */
  showGeneral(): void {
    if (this.find(GENERAL_ID) !== undefined) return;
    // `omp-chat-general.SHOWN`: General is in the view, and the usage is asked for.
    this.usage?.request();
    const general: Tab = { id: GENERAL_ID, name: "General", session: undefined, inTurn: false, working: false, forms: new Set(), permissions: new Map(), start: {}, subscriptions: [] };
    this.tabs.unshift(general);
    if (this.selected === undefined) this.selected = GENERAL_ID;
    this.refresh();
    this.postConversations();
    if (this.ready) this.surface.post({ type: "conversationStart", id: GENERAL_ID, focus: false });
  }

  /** General's session, or none while its process starts or after it stopped; a session's history is replayed to the tab, as for any conversation. */
  setGeneralSession(session: OmpSessionPort | undefined): void {
    const tab = this.find(GENERAL_ID);
    if (tab === undefined) return;
    this.unsubscribe(tab);
    tab.session = session;
    tab.inTurn = session?.inTurn ?? false;
    tab.permissions.clear();
    this.postConversations();
    if (session !== undefined) this.subscribe(tab);
  }

  /** General's process state, drawn in its tab; it stays until General leaves the view. */
  generalStatus(status: GeneralStatus): void {
    this.lastGeneralStatus = status;
    if (this.ready) this.surface.post({ type: "generalStatus", ...status });
  }

  /** General's transcript was cleared: the forms still waiting are refused, and the tab is empty again. */
  generalCleared(): void {
    const tab = this.find(GENERAL_ID);
    if (tab === undefined) return;
    for (const requestId of tab.forms) tab.session?.answerForm(requestId, { action: "decline" });
    tab.forms.clear();
    tab.permissions.clear();
    this.postConversations();
    if (this.ready) this.surface.post({ type: "conversationCleared", id: GENERAL_ID });
  }

  /** A message the developer sent did not start: its text goes back into the field of the tab (General's too). An empty text sends nothing. */
  returnToField(id: string, text: string): void {
    if (text === "") return;
    this.surface.post({ type: "returnToField", id, text });
  }

  /** General leaves the view. */
  removeGeneral(): void {
    const tab = this.find(GENERAL_ID);
    if (tab === undefined) return;
    this.lastGeneralStatus = undefined;
    this.remove(tab);
  }

  setWorking(id: string, working: boolean): void {
    const tab = this.find(id);
    if (tab === undefined || tab.working === working) return;
    tab.working = working;
    this.postConversations();
  }

  close(id: string): void {
    const tab = this.find(id);
    if (tab === undefined) return;
    this.remove(tab);
  }

  onStopRequested(listener: (id: string) => void): Disposable {
    this.stopListeners.add(listener);
    return { dispose: () => void this.stopListeners.delete(listener) };
  }

  onCloseRequested(listener: (id: string) => void): Disposable {
    this.closeListeners.add(listener);
    return { dispose: () => void this.closeListeners.delete(listener) };
  }

  onClearGeneralRequested(listener: () => void): Disposable {
    this.clearListeners.add(listener);
    return { dispose: () => void this.clearListeners.delete(listener) };
  }

  onInstallOmpRequested(listener: () => void): Disposable {
    this.installListeners.add(listener);
    return { dispose: () => void this.installListeners.delete(listener) };
  }

  onGeneralMessage(listener: (message: OutgoingMessage) => void): Disposable {
    this.generalListeners.add(listener);
    return { dispose: () => void this.generalListeners.delete(listener) };
  }

  /** A message from the webview: validated, and ignored when it does not fit the protocol. */
  receive(raw: unknown): void {
    const message = parseChatMessage(raw);
    if (message === undefined) return;
    switch (message.type) {
      case "ready":
        this.webviewReady();
        return;
      case "selectConversation":
        if (this.find(message.id) === undefined) return;
        this.selected = message.id;
        this.postConversations();
        return;
      case "sendMessage": {
        const tab = this.find(message.id);
        if (tab === undefined) return;
        const report = (status: SendStatus): void => this.surface.post({ type: "messageStatus", id: tab.id, messageId: message.messageId, ...status });
        if (tab.id === GENERAL_ID) {
          for (const listener of [...this.generalListeners]) listener({ text: message.text, mode: this.sendMode, report });
          return;
        }
        // A conversation with no session yet (omp starts) sends nothing: its field is not enabled then.
        if (tab.session === undefined) return;
        const instruction = tab.instruction;
        const prompt: OmpPrompt = instruction === undefined ? { text: message.text } : instruction.compose(message.text);
        if (instruction !== undefined) {
          // The instruction goes with the first message only: from now on the field shows its own placeholder and the messages go alone.
          tab.instruction = undefined;
          instruction.sent();
          this.postConversations();
        }
        tab.session.send(prompt, this.sendMode, report).catch((err: unknown) => this.error(tab, messageOf(err)));
        return;
      }
      case "setSendMode":
        this.sendMode = message.mode;
        void this.sendModes.update(SEND_MODE_KEY, message.mode);
        this.surface.post({ type: "sendMode", mode: message.mode });
        return;
      case "stopAgent":
        if (this.find(message.id) !== undefined) for (const listener of [...this.stopListeners]) listener(message.id);
        return;
      case "closeConversation":
        if (this.find(message.id) !== undefined) for (const listener of [...this.closeListeners]) listener(message.id);
        return;
      case "clearGeneral":
        if (this.find(GENERAL_ID) !== undefined) for (const listener of [...this.clearListeners]) listener();
        return;
      case "installOmp":
        if (this.find(GENERAL_ID) !== undefined) for (const listener of [...this.installListeners]) listener();
        return;
      case "refreshUsage":
        // Only General shows the usage; a window without General asks for none.
        if (this.find(GENERAL_ID) !== undefined) this.usage?.request();
        return;
      case "setModel": {
        const tab = this.find(message.id);
        if (tab?.session === undefined) return;
        tab.session.setModel(message.model).then(
          () => void this.postModels(tab),
          (err: unknown) => this.error(tab, messageOf(err)),
        );
        return;
      }
      case "formAnswer": {
        const tab = this.find(message.id);
        if (tab === undefined || !tab.forms.delete(message.requestId)) return;
        tab.session?.answerForm(message.requestId, message.answer);
        this.postConversations();
        return;
      }
      case "permissionAnswer": {
        const tab = this.find(message.id);
        // An answer that is not one of the offered options is ignored and the request keeps waiting.
        if (tab === undefined || tab.permissions.get(message.requestId)?.includes(message.optionId) !== true) return;
        tab.permissions.delete(message.requestId);
        tab.session?.answerPermission(message.requestId, message.optionId);
        this.postConversations();
        return;
      }
      case "openLink":
        this.surface.openLink(message.url);
        return;
    }
  }

  private facts() {
    return {
      inUse: this.inUse(),
      folder: this.folder(),
      general: this.find(GENERAL_ID) !== undefined,
      conversations: new Set([...this.tabs.filter((tab) => tab.id !== GENERAL_ID).map((tab) => tab.id), ...this.pending()]).size,
    };
  }

  private find(id: string): Tab | undefined {
    return this.tabs.find((tab) => tab.id === id);
  }

  /** Removes a tab: the forms still waiting are refused, and the tab in view is picked again. */
  private remove(tab: Tab): void {
    // The forms still waiting are refused, so the agent does not wait for a developer who closed the conversation.
    for (const requestId of tab.forms) tab.session?.answerForm(requestId, { action: "decline" });
    this.unsubscribe(tab);
    this.selected = tabAfterClose(
      this.tabs.map((each) => each.id),
      tab.id,
      this.selected,
    );
    this.tabs.splice(this.tabs.indexOf(tab), 1);
    this.postConversations();
    this.refresh();
  }

  private runState(tab: Tab): ConversationRunState {
    if (tab.forms.size > 0) return "waiting-form";
    if (tab.permissions.size > 0) return "waiting-permission";
    return tab.inTurn || tab.working ? "running" : "idle";
  }

  private postUsage(): void {
    if (this.ready && this.usage !== undefined) this.surface.post(this.usage.message());
  }

  private postConversations(): void {
    const states = this.tabs.map((tab) => [tab.id, this.runState(tab)] as const);
    const endedTurn = states.some(([id, state]) => state !== "running" && this.lastStates.get(id) === "running");
    this.lastStates.clear();
    for (const [id, state] of states) this.lastStates.set(id, state);
    // A turn of any conversation of the window ended: General, when it is there, asks for the usage.
    if (endedTurn && this.find(GENERAL_ID) !== undefined) this.usage?.request();
    if (!this.ready) return;
    const items: ConversationItem[] = this.tabs.map((tab) => ({
      id: tab.id,
      name: tab.name,
      state: this.runState(tab),
      ...(tab.model === undefined ? {} : { model: tab.model }),
      ...(tab.id === GENERAL_ID ? { general: true as const } : {}),
      ...(tab.instruction === undefined ? {} : { placeholder: tab.instruction.placeholder }),
      ...(tab.session === undefined && tab.id !== GENERAL_ID ? { starting: true as const } : {}),
    }));
    this.surface.post({ type: "conversations", items, ...(this.selected === undefined ? {} : { selected: this.selected }) });
  }

  private error(tab: Tab, message: string): void {
    this.surface.post({ type: "conversationError", id: tab.id, message });
  }

  private async postModels(tab: Tab): Promise<void> {
    if (tab.session === undefined) return;
    try {
      const { available, current } = await tab.session.models();
      if (this.find(tab.id) !== tab) return;
      tab.model = current;
      this.surface.post({ type: "models", id: tab.id, available, ...(current === undefined ? {} : { current }) });
      this.postConversations();
    } catch (err) {
      this.error(tab, messageOf(err));
    }
  }

  /** Follows the session: its notifications (the history first), its turns, its forms and its models. */
  private subscribe(tab: Tab): void {
    this.unsubscribe(tab);
    // The session replays the requests still waiting; the ones cancelled while the webview was gone are not there.
    tab.permissions.clear();
    const { session } = tab;
    if (session === undefined) return;
    tab.inTurn = session.inTurn;
    tab.subscriptions = [
      session.onUpdate((update) => this.surface.post({ type: "conversationUpdate", id: tab.id, update })),
      session.onTurn((inTurn) => {
        tab.inTurn = inTurn;
        this.postConversations();
      }),
      session.onFormRequest((request) => {
        tab.forms.add(request.requestId);
        this.surface.post({ type: "formRequest", id: tab.id, requestId: request.requestId, message: request.message, schema: request.schema });
        this.postConversations();
      }),
      session.onPermissionRequest((request) => {
        tab.permissions.set(request.requestId, request.options.map((option) => option.optionId));
        this.surface.post({ type: "permissionRequest", id: tab.id, requestId: request.requestId, toolCall: request.toolCall, options: request.options });
        this.postConversations();
      }),
      session.onPermissionCancelled((requestId) => {
        if (!tab.permissions.delete(requestId)) return;
        this.surface.post({ type: "permissionCancelled", id: tab.id, requestId });
        this.postConversations();
      }),
    ];
    void this.postModels(tab);
  }

  private unsubscribe(tab: Tab): void {
    for (const subscription of tab.subscriptions) subscription.dispose();
    tab.subscriptions = [];
  }
}
