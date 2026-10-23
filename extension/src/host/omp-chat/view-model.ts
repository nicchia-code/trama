import { chatViewState, tabAfterClose } from "../../../../src/core/omp-chat-view";
import type { ConversationItem, ConversationRunState, FirstMessage, ToChatWebview } from "../../omp-chat-protocol";
import type { ThemeSetting } from "../../webview/theme";
import { parseChatMessage } from "./messages";
import type { ChatViewPort, ConversationTab, Disposable, OmpPrompt, OmpSessionPort } from "./ports";

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
  openFile(path: string): void;
  openLink(url: string): void;
}

interface Tab {
  id: string;
  name: string;
  session: OmpSessionPort;
  /** The agent is in a turn. */
  inTurn: boolean;
  /** The conversation works for Trama (`setWorking`). */
  working: boolean;
  forms: Set<string>;
  /** The permission requests waiting for the developer, with the ids of the options omp offered. */
  permissions: Map<string, string[]>;
  model?: string;
  start: { first?: FirstMessage; notice?: string };
  subscriptions: Disposable[];
}

const messageOf = (err: unknown): string => (err instanceof Error ? err.message : String(err));

const promptOf = (prompt: OmpPrompt, surface: ChatSurface): FirstMessage => {
  const text = prompt.attachment === undefined ? undefined : surface.readText(prompt.attachment);
  const name = prompt.attachment?.split(/[\\/]/).pop();
  return { text: prompt.text, ...(prompt.attachment === undefined || name === undefined ? {} : { attachment: { name, text: text ?? "" } }) };
};

/**
 * The omp Chat view of one window (`omp-chat` Machine): the tabs of its conversations, the one in view, the context key that shows or hides it and the
 * messages with the webview. It implements `ChatViewPort` for the conversations (`conversations.ts`).
 */
export class ChatViewModel implements ChatViewPort {
  private readonly tabs: Tab[] = [];
  private selected: string | undefined;
  private visible: boolean | undefined;
  private ready = false;
  private readonly stopListeners = new Set<(id: string) => void>();
  private readonly closeListeners = new Set<(id: string) => void>();

  /**
   * `inUse`: omp Chat on, not turned off in the user settings (read now). `pending`: the conversations the window has saved and waits to resume, by
   * id (read now), which keep the view like open ones.
   */
  constructor(
    private readonly surface: ChatSurface,
    private readonly inUse: () => boolean,
    private readonly pending: () => readonly string[] = () => [],
  ) {
    this.refresh();
  }

  /** The state of the view now. */
  get state() {
    return chatViewState({ inUse: this.inUse(), conversations: this.count() });
  }

  /** `editor.SETTINGS_CHANGED`, or the end of a resume: the context key follows the settings and the conversations. */
  refresh(): void {
    const visible = this.state !== "hidden";
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
    this.postConversations();
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

  open(tab: ConversationTab, session: OmpSessionPort, options: { focus: boolean; notice?: string; first?: OmpPrompt }): void {
    const start: Tab["start"] = {
      ...(options.first === undefined ? {} : { first: promptOf(options.first, this.surface) }),
      ...(options.notice === undefined ? {} : { notice: options.notice }),
    };
    const created: Tab = { id: tab.id, name: tab.name, session, inTurn: session.inTurn, working: false, forms: new Set(), permissions: new Map(), start, subscriptions: [] };
    this.tabs.push(created);
    this.selected = tab.id;
    this.refresh();
    this.surface.reveal(!options.focus);
    if (!this.ready) return;
    this.postConversations();
    this.surface.post({ type: "conversationStart", id: tab.id, focus: options.focus, ...start });
    this.subscribe(created);
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
    // The forms still waiting are refused, so the agent does not wait for a developer who closed the conversation.
    for (const requestId of tab.forms) tab.session.answerForm(requestId, { action: "decline" });
    this.unsubscribe(tab);
    this.selected = tabAfterClose(
      this.tabs.map((each) => each.id),
      id,
      this.selected,
    );
    this.tabs.splice(this.tabs.indexOf(tab), 1);
    this.postConversations();
    this.refresh();
  }

  onStopRequested(listener: (id: string) => void): Disposable {
    this.stopListeners.add(listener);
    return { dispose: () => void this.stopListeners.delete(listener) };
  }

  onCloseRequested(listener: (id: string) => void): Disposable {
    this.closeListeners.add(listener);
    return { dispose: () => void this.closeListeners.delete(listener) };
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
        tab.session.sendPrompt({ text: message.text }).catch((err: unknown) => this.error(tab, messageOf(err)));
        return;
      }
      case "stopAgent":
        if (this.find(message.id) !== undefined) for (const listener of [...this.stopListeners]) listener(message.id);
        return;
      case "closeConversation":
        if (this.find(message.id) !== undefined) for (const listener of [...this.closeListeners]) listener(message.id);
        return;
      case "setModel": {
        const tab = this.find(message.id);
        if (tab === undefined) return;
        tab.session.setModel(message.model).then(
          () => void this.postModels(tab),
          (err: unknown) => this.error(tab, messageOf(err)),
        );
        return;
      }
      case "formAnswer": {
        const tab = this.find(message.id);
        if (tab === undefined || !tab.forms.delete(message.requestId)) return;
        tab.session.answerForm(message.requestId, message.answer);
        this.postConversations();
        return;
      }
      case "permissionAnswer": {
        const tab = this.find(message.id);
        // An answer that is not one of the offered options is ignored and the request keeps waiting.
        if (tab === undefined || tab.permissions.get(message.requestId)?.includes(message.optionId) !== true) return;
        tab.permissions.delete(message.requestId);
        tab.session.answerPermission(message.requestId, message.optionId);
        this.postConversations();
        return;
      }
      case "openFile":
        this.surface.openFile(message.path);
        return;
      case "openLink":
        this.surface.openLink(message.url);
        return;
    }
  }

  private count(): number {
    return new Set([...this.tabs.map((tab) => tab.id), ...this.pending()]).size;
  }

  private find(id: string): Tab | undefined {
    return this.tabs.find((tab) => tab.id === id);
  }

  private runState(tab: Tab): ConversationRunState {
    if (tab.forms.size > 0) return "waiting-form";
    if (tab.permissions.size > 0) return "waiting-permission";
    return tab.inTurn || tab.working ? "running" : "idle";
  }

  private postConversations(): void {
    if (!this.ready) return;
    const items: ConversationItem[] = this.tabs.map((tab) => ({ id: tab.id, name: tab.name, state: this.runState(tab), ...(tab.model === undefined ? {} : { model: tab.model }) }));
    this.surface.post({ type: "conversations", items, ...(this.selected === undefined ? {} : { selected: this.selected }) });
  }

  private error(tab: Tab, message: string): void {
    this.surface.post({ type: "conversationError", id: tab.id, message });
  }

  private async postModels(tab: Tab): Promise<void> {
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
