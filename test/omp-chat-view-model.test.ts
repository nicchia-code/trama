import { beforeEach, describe, expect, test } from "bun:test";
import type { SessionNotification } from "@agentclientprotocol/sdk";
import { type ChatSurface, ChatViewModel } from "../extension/src/host/omp-chat/view-model";
import { parseChatMessage } from "../extension/src/host/omp-chat/messages";
import type { Disposable, FormAnswer, FormRequest, OmpExit, OmpPrompt, OmpSessionPort } from "../extension/src/host/omp-chat/ports";
import type { ToChatWebview } from "../extension/src/omp-chat-protocol";

class FakeSession implements OmpSessionPort {
  pid = 1;
  inTurn = false;
  prompts: OmpPrompt[] = [];
  answers: { requestId: string; answer: FormAnswer }[] = [];
  modelsSet: string[] = [];
  failModel: string | undefined;
  private updateListeners: ((n: SessionNotification) => void)[] = [];
  private turnListeners: ((inTurn: boolean) => void)[] = [];
  private formListeners: ((request: FormRequest) => void)[] = [];
  history: SessionNotification[] = [];
  constructor(readonly sessionId = "s1") {}
  async sendPrompt(prompt: OmpPrompt): Promise<void> {
    this.prompts.push(prompt);
  }
  cancel(): void {}
  async stop(): Promise<void> {}
  onExit(_listener: (exit: OmpExit) => void): Disposable {
    return { dispose() {} };
  }
  onUpdate(listener: (n: SessionNotification) => void): Disposable {
    this.updateListeners.push(listener);
    for (const past of this.history) listener(past);
    return { dispose: () => void (this.updateListeners = this.updateListeners.filter((each) => each !== listener)) };
  }
  onTurn(listener: (inTurn: boolean) => void): Disposable {
    this.turnListeners.push(listener);
    return { dispose: () => void (this.turnListeners = this.turnListeners.filter((each) => each !== listener)) };
  }
  onFormRequest(listener: (request: FormRequest) => void): Disposable {
    this.formListeners.push(listener);
    return { dispose: () => void (this.formListeners = this.formListeners.filter((each) => each !== listener)) };
  }
  answerForm(requestId: string, answer: FormAnswer): void {
    this.answers.push({ requestId, answer });
  }
  async models() {
    return { available: [{ id: "m1", name: "Model one" }], current: "m1" };
  }
  async setModel(id: string): Promise<void> {
    if (this.failModel !== undefined) throw new Error(this.failModel);
    this.modelsSet.push(id);
  }
  emit(notification: SessionNotification): void {
    for (const listener of this.updateListeners) listener(notification);
  }
  turn(inTurn: boolean): void {
    this.inTurn = inTurn;
    for (const listener of this.turnListeners) listener(inTurn);
  }
  ask(request: FormRequest): void {
    for (const listener of this.formListeners) listener(request);
  }
}

interface Fake {
  posted: ToChatWebview[];
  visible: boolean[];
  reveals: boolean[];
  opened: string[];
  links: string[];
}

function setup(options: { inUse?: boolean; pending?: string[] } = {}) {
  const fake: Fake = { posted: [], visible: [], reveals: [], opened: [], links: [] };
  const state = { inUse: options.inUse ?? true, pending: options.pending ?? [] };
  const surface: ChatSurface = {
    post: (message) => void fake.posted.push(message),
    setVisible: (visible) => void fake.visible.push(visible),
    reveal: (preserveFocus) => void fake.reveals.push(preserveFocus),
    theme: () => "auto",
    readText: (path) => (path === "/tmp/attached.md" ? "attached text" : undefined),
    openFile: (path) => void fake.opened.push(path),
    openLink: (url) => void fake.links.push(url),
  };
  const model = new ChatViewModel(surface, () => state.inUse, () => state.pending);
  return { model, fake, state };
}

const conversations = (fake: Fake) => fake.posted.filter((message): message is Extract<ToChatWebview, { type: "conversations" }> => message.type === "conversations");
const lastConversations = (fake: Fake) => conversations(fake)[conversations(fake).length - 1];

let session: FakeSession;
beforeEach(() => {
  session = new FakeSession();
});

describe("the context key", () => {
  test("is set when the view is made: false in Hidden, true in Empty", () => {
    expect(setup({ inUse: false }).fake.visible).toEqual([false]);
    expect(setup({ inUse: true }).fake.visible).toEqual([true]);
  });

  test("follows the settings", () => {
    const { model, fake, state } = setup({ inUse: false });
    state.inUse = true;
    model.refresh();
    state.inUse = true;
    model.refresh();
    state.inUse = false;
    model.refresh();
    expect(fake.visible).toEqual([false, true, false]);
  });

  test("a conversation waiting to resume keeps the view while omp Chat is off", () => {
    const { model, fake, state } = setup({ inUse: false, pending: ["c1"] });
    expect(fake.visible).toEqual([true]);
    expect(model.state).toBe("with-conversations");
    state.pending = [];
    model.refresh();
    expect(fake.visible).toEqual([true, false]);
  });

  test("an open conversation keeps the view after omp Chat is turned off, until the last one closes", () => {
    const { model, fake, state } = setup();
    model.open({ id: "a", name: "T3" }, session, { focus: false });
    state.inUse = false;
    model.refresh();
    expect(model.state).toBe("with-conversations");
    expect(fake.visible).toEqual([true]);
    model.close("a");
    expect(model.state).toBe("hidden");
    expect(fake.visible).toEqual([true, false]);
  });

  test("closing the last conversation with omp Chat in use goes back to Empty and keeps the view", () => {
    const { model, fake } = setup();
    model.open({ id: "a", name: "T3" }, session, { focus: false });
    model.close("a");
    expect(model.state).toBe("empty");
    expect(fake.visible).toEqual([true]);
  });
});

describe("opening, selecting and closing", () => {
  test("a new conversation adds its tab at the end and takes the view; jobs show the view without the focus, Quick Task with it", () => {
    const { model, fake } = setup();
    model.webviewReady();
    model.open({ id: "a", name: "T3" }, session, { focus: false });
    model.open({ id: "b", name: "Quick" }, new FakeSession("s2"), { focus: true });
    expect(fake.reveals).toEqual([true, false]);
    const last = lastConversations(fake);
    expect(last?.items.map((item) => item.name)).toEqual(["T3", "Quick"]);
    expect(last?.selected).toBe("b");
    expect(fake.posted.filter((m) => m.type === "conversationStart").map((m) => (m as { focus: boolean }).focus)).toEqual([false, true]);
  });

  test("the first message carries the instruction and its attachment", () => {
    const { model, fake } = setup();
    model.webviewReady();
    model.open({ id: "a", name: "Unify" }, session, { focus: false, first: { text: "Do it", attachment: "/tmp/attached.md" }, notice: "The window reloaded; the agent continues its work." });
    const start = fake.posted.find((message) => message.type === "conversationStart");
    expect(start).toEqual({ type: "conversationStart", id: "a", focus: false, first: { text: "Do it", attachment: { name: "attached.md", text: "attached text" } }, notice: "The window reloaded; the agent continues its work." });
  });

  test("closing the tab in view moves to its neighbour; closing another keeps the one in view", () => {
    const { model, fake } = setup();
    model.webviewReady();
    for (const id of ["a", "b", "c"]) model.open({ id, name: id.toUpperCase() }, new FakeSession(id), { focus: false });
    model.receive({ type: "selectConversation", id: "b" });
    model.close("a");
    expect(lastConversations(fake)?.selected).toBe("b");
    model.close("b");
    expect(lastConversations(fake)).toMatchObject({ items: [{ id: "c" }], selected: "c" });
  });

  test("closing refuses the forms still waiting", () => {
    const { model } = setup();
    model.webviewReady();
    model.open({ id: "a", name: "T3" }, session, { focus: false });
    session.ask({ requestId: "r1", message: "Which?", schema: { type: "object" } });
    model.close("a");
    expect(session.answers).toEqual([{ requestId: "r1", answer: { action: "decline" } }]);
  });

  test("the dot follows the turn, the work for Trama and a waiting form", () => {
    const { model, fake } = setup();
    model.webviewReady();
    model.open({ id: "a", name: "T3" }, session, { focus: false });
    expect(lastConversations(fake)?.items[0]?.state).toBe("idle");
    session.turn(true);
    expect(lastConversations(fake)?.items[0]?.state).toBe("running");
    session.ask({ requestId: "r1", message: "?", schema: { type: "object" } });
    expect(lastConversations(fake)?.items[0]?.state).toBe("waiting-form");
    model.receive({ type: "formAnswer", id: "a", requestId: "r1", answer: { action: "decline" } });
    expect(lastConversations(fake)?.items[0]?.state).toBe("running");
    session.turn(false);
    model.setWorking("a", true);
    expect(lastConversations(fake)?.items[0]?.state).toBe("running");
    model.setWorking("a", false);
    expect(lastConversations(fake)?.items[0]?.state).toBe("idle");
  });
});

describe("the webview", () => {
  test("a conversation opened before the webview exists is sent, with its history replayed, when the webview is ready", () => {
    const { model, fake } = setup();
    session.history = [{ sessionId: "s1", update: { sessionUpdate: "agent_message_chunk", content: { type: "text", text: "hi" } } }];
    model.open({ id: "a", name: "T3" }, session, { focus: false });
    expect(fake.posted).toEqual([]);
    model.receive({ type: "ready" });
    expect(fake.posted.map((message) => message.type)).toEqual(["reset", "theme", "conversations", "conversationStart", "conversationUpdate"]);
  });

  test("a second ready replays the history again over a reset, without listening twice", () => {
    const { model, fake } = setup();
    model.open({ id: "a", name: "T3" }, session, { focus: false });
    model.webviewReady();
    model.webviewReady();
    fake.posted.length = 0;
    session.emit({ sessionId: "s1", update: { sessionUpdate: "agent_message_chunk", content: { type: "text", text: "x" } } });
    expect(fake.posted.filter((message) => message.type === "conversationUpdate")).toHaveLength(1);
  });

  test("the models of the session are sent", async () => {
    const { model, fake } = setup();
    model.webviewReady();
    model.open({ id: "a", name: "T3" }, session, { focus: false });
    await Promise.resolve();
    await Promise.resolve();
    expect(fake.posted).toContainEqual({ type: "models", id: "a", available: [{ id: "m1", name: "Model one" }], current: "m1" });
  });
});

describe("messages from the webview", () => {
  test("a message the developer sends reaches the session", () => {
    const { model } = setup();
    model.webviewReady();
    model.open({ id: "a", name: "T3" }, session, { focus: false });
    model.receive({ type: "sendMessage", id: "a", text: "go on" });
    expect(session.prompts).toEqual([{ text: "go on" }]);
  });

  test("Stop and the X ask the conversations, which confirm", () => {
    const { model } = setup();
    model.open({ id: "a", name: "T3" }, session, { focus: false });
    const stops: string[] = [];
    const closes: string[] = [];
    model.onStopRequested((id) => void stops.push(id));
    model.onCloseRequested((id) => void closes.push(id));
    model.receive({ type: "stopAgent", id: "a" });
    model.receive({ type: "closeConversation", id: "a" });
    model.receive({ type: "closeConversation", id: "nope" });
    expect({ stops, closes }).toEqual({ stops: ["a"], closes: ["a"] });
  });

  test("a model change reaches the session, and a refusal is shown in the conversation", async () => {
    const { model, fake } = setup();
    model.webviewReady();
    model.open({ id: "a", name: "T3" }, session, { focus: false });
    model.receive({ type: "setModel", id: "a", model: "m2" });
    await Promise.resolve();
    expect(session.modelsSet).toEqual(["m2"]);
    session.failModel = "unknown model";
    model.receive({ type: "setModel", id: "a", model: "bad" });
    for (let turn = 0; turn < 5; turn++) await Promise.resolve();
    expect(fake.posted).toContainEqual({ type: "conversationError", id: "a", message: "unknown model" });
  });

  test("an answer settles a form that waits, once", () => {
    const { model } = setup();
    model.webviewReady();
    model.open({ id: "a", name: "T3" }, session, { focus: false });
    session.ask({ requestId: "r1", message: "?", schema: { type: "object" } });
    const answer = { action: "accept" as const, content: { pick: "x" } };
    model.receive({ type: "formAnswer", id: "a", requestId: "r1", answer });
    model.receive({ type: "formAnswer", id: "a", requestId: "r1", answer });
    model.receive({ type: "formAnswer", id: "a", requestId: "unknown", answer });
    expect(session.answers).toEqual([{ requestId: "r1", answer }]);
  });

  test("files and links open through the surface", () => {
    const { model, fake } = setup();
    model.receive({ type: "openFile", path: "src/a.ts" });
    model.receive({ type: "openLink", url: "https://example.com" });
    expect(fake.opened).toEqual(["src/a.ts"]);
    expect(fake.links).toEqual(["https://example.com"]);
  });

  test("a message that does not fit the protocol is ignored", () => {
    const { model, fake } = setup();
    model.webviewReady();
    model.open({ id: "a", name: "T3" }, session, { focus: false });
    fake.posted.length = 0;
    for (const bad of [null, "text", {}, { type: "sendMessage" }, { type: "sendMessage", id: "a", text: "" }, { type: "sendMessage", id: "a", text: "x", extra: 1 }, { type: "formAnswer", id: "a", requestId: "r", answer: { action: "maybe" } }, { type: "unknown" }]) {
      model.receive(bad);
    }
    expect(session.prompts).toEqual([]);
    expect(fake.posted).toEqual([]);
  });
});

describe("validation of what the webview sends", () => {
  test("accepts every message of the protocol", () => {
    for (const message of [
      { type: "ready" },
      { type: "selectConversation", id: "a" },
      { type: "sendMessage", id: "a", text: "hi" },
      { type: "stopAgent", id: "a" },
      { type: "closeConversation", id: "a" },
      { type: "setModel", id: "a", model: "m" },
      { type: "formAnswer", id: "a", requestId: "r", answer: { action: "accept", content: { one: "x", two: ["a", "b"], three: true, four: 4 } } },
      { type: "formAnswer", id: "a", requestId: "r", answer: { action: "decline" } },
      { type: "openFile", path: "a.ts" },
      { type: "openLink", url: "https://x.y" },
    ]) {
      expect(parseChatMessage(message)).toEqual(message as never);
    }
  });

  test("refuses a value of the wrong type or size", () => {
    expect(parseChatMessage({ type: "sendMessage", id: 1, text: "x" })).toBeUndefined();
    expect(parseChatMessage({ type: "sendMessage", id: "a", text: "x".repeat(300_000) })).toBeUndefined();
    expect(parseChatMessage({ type: "formAnswer", id: "a", requestId: "r", answer: { action: "accept", content: { a: { nested: 1 } } } })).toBeUndefined();
  });
});
