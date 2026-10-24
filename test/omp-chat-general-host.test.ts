import { describe, expect, test } from "bun:test";
import { GENERAL_ID } from "../src/core/omp-chat-view";
import { GENERAL_KEY, GeneralConversation, type GeneralDeps, type SavedGeneral } from "../extension/src/host/omp-chat/general";
import type { ConversationStore } from "../extension/src/host/omp-chat/conversations";
import { type ChatViewPort, type Disposable, type OmpClientPort, type OmpExit, type OmpLaunch, type OmpPrompt, OmpStartFailure, type OmpSessionPort, type OutgoingMessage, type SendStatus } from "../extension/src/host/omp-chat/ports";
import type { SendMode } from "../extension/src/omp-chat-protocol";
import { type ChatState, initialChatState, reduce } from "../extension/src/webview/omp-chat/state";
import { findConfiguredOmp } from "../extension/src/host/omp-update";

/** The fakes resolve at once, so draining the microtask queue is enough: no timer is needed. */
async function settle(): Promise<void> {
  for (let i = 0; i < 50; i++) await Promise.resolve();
}

/** A real file check (`access`) finishes outside the microtask queue: wait, bounded, until the state changes. */
async function waitFor(done: () => boolean): Promise<void> {
  for (let i = 0; i < 200 && !done(); i++) await new Promise((resolve) => setTimeout(resolve, 5));
}

/** A message the developer sent from General's field, in the mode the view chose. */
const sent = (text: string, mode: SendMode = "steer"): OutgoingMessage => ({ text, mode, report: () => undefined });

class FakeSession implements OmpSessionPort {
  pid: number | undefined = 4242;
  inTurn = false;
  prompts: OmpPrompt[] = [];
  sends: { prompt: OmpPrompt; mode: SendMode }[] = [];
  cancels = 0;
  stops = 0;
  private exitListeners: ((exit: OmpExit) => void)[] = [];
  constructor(readonly sessionId: string) {}
  async sendPrompt(prompt: OmpPrompt): Promise<void> {
    this.prompts.push(prompt);
  }
  async send(prompt: OmpPrompt, mode: SendMode, report: (status: SendStatus) => void): Promise<void> {
    this.sends.push({ prompt, mode });
    report({ status: "delivered" });
  }
  cancel(): void {
    this.cancels++;
  }
  async stop(): Promise<void> {
    this.stops++;
  }
  exit(exit: OmpExit): void {
    for (const listener of [...this.exitListeners]) listener(exit);
  }
  onExit(listener: (exit: OmpExit) => void): Disposable {
    this.exitListeners.push(listener);
    return { dispose: () => void (this.exitListeners = this.exitListeners.filter((l) => l !== listener)) };
  }
  onUpdate(): Disposable {
    return { dispose: () => undefined };
  }
  onTurn(): Disposable {
    return { dispose: () => undefined };
  }
  onFormRequest(): Disposable {
    return { dispose: () => undefined };
  }
  answerForm(): void {}
  onPermissionRequest(): Disposable {
    return { dispose: () => undefined };
  }
  answerPermission(): void {}
  onPermissionCancelled(): Disposable {
    return { dispose: () => undefined };
  }
  async models() {
    return { available: [] };
  }
  async setModel(): Promise<void> {}
}

class FakeClient implements OmpClientPort {
  starts: OmpLaunch[] = [];
  resumes: { launch: OmpLaunch; sessionId: string }[] = [];
  sessions: FakeSession[] = [];
  /** How many of the next starts fail (omp exits before the session opens). */
  startFailures = 0;
  resumeFails = false;
  async start(launch: OmpLaunch): Promise<OmpSessionPort> {
    this.starts.push(launch);
    if (this.startFailures > 0) {
      this.startFailures--;
      throw new OmpStartFailure("omp exited with code 1");
    }
    const session = new FakeSession(`s${this.starts.length}`);
    this.sessions.push(session);
    return session;
  }
  async resume(launch: OmpLaunch, sessionId: string): Promise<OmpSessionPort> {
    this.resumes.push({ launch, sessionId });
    if (this.resumeFails) throw new OmpStartFailure("session not found");
    const session = new FakeSession(sessionId);
    this.sessions.push(session);
    return session;
  }
}

type Status = { phase: string; error?: { kind: string; reason?: string }; newSession?: boolean };

/** The view's side of General: what it is told, and the listeners the view calls back. */
class FakeView {
  shown = 0;
  cleared = 0;
  statuses: Status[] = [];
  returned: { id: string; text: string }[] = [];
  private readonly handlers: Record<string, (...args: unknown[]) => void> = {};
  listen(name: string) {
    return (listener: (...args: unknown[]) => void): Disposable => {
      this.handlers[name] = listener;
      return { dispose: () => undefined };
    };
  }
  onStopRequested = this.listen("stop");
  onCloseRequested = this.listen("close");
  onClearGeneralRequested = this.listen("clear");
  onInstallOmpRequested = this.listen("install");
  onGeneralMessage = this.listen("message");
  showGeneral(): void {
    this.shown++;
  }
  removeGeneral(): void {}
  setGeneralSession(_session: OmpSessionPort | undefined): void {}
  setSession(_id: string, _session: OmpSessionPort): void {}
  generalStatus(status: Status): void {
    this.statuses.push(status);
  }
  generalCleared(): void {
    this.cleared++;
  }
  returnToField(id: string, text: string): void {
    this.returned.push({ id, text });
  }
  emit(name: string, ...args: unknown[]): void {
    this.handlers[name]?.(...args);
  }
  get last(): Status | undefined {
    return this.statuses.at(-1);
  }
}

class MemoryStore implements ConversationStore {
  values = new Map<string, unknown>();
  get(key: string): unknown {
    return this.values.get(key);
  }
  async update(key: string, value: unknown): Promise<void> {
    if (value === undefined) this.values.delete(key);
    else this.values.set(key, value);
  }
}

const saved: SavedGeneral = { id: "t1", sessionId: "old", args: ["acp"], env: { PI_INTENT_TRACING: "1" }, startedAt: "2024-01-01T00:00:00.000Z" };

interface Options {
  saved?: SavedGeneral;
  startFailures?: number;
  resumeFails?: boolean;
  /** The developer's answer to the confirmation of a clear during a turn. */
  answer?: boolean;
  /** Whether omp is installed. */
  installed?: boolean;
  /** The configured omp path; the real lookup of `findConfiguredOmp` decides whether it resolves when `realFindOmp` is set. */
  ompPath?: string;
  realFindOmp?: boolean;
  /** Whether the package has no General instructions file. */
  noInstructions?: boolean;
}

function setup(options: Options = {}) {
  const client = new FakeClient();
  client.startFailures = options.startFailures ?? 0;
  client.resumeFails = options.resumeFails ?? false;
  const view = new FakeView();
  const store = new MemoryStore();
  if (options.saved !== undefined) store.values.set(GENERAL_KEY, options.saved);
  const confirmations = { asked: 0, answer: options.answer ?? true };
  const installed = options.installed ?? true;
  const ends: [string, string][] = [];
  const usability = { usable: true };
  const deps: GeneralDeps = {
    client,
    view: view as unknown as ChatViewPort,
    store,
    folder: () => "/work/project",
    usable: () => usability.usable,
    ompPath: () => options.ompPath ?? "omp",
    findOmp: options.realFindOmp ? (ompPath) => findConfiguredOmp(ompPath, { PATH: "" }, "/nonexistent-home", false) : async () => (installed ? "/usr/local/bin/omp" : undefined),
    instructions: () => (options.noInstructions ? undefined : "/ext/media/general.md"),
    launch: async (root, terminalId) => ({ args: ["acp"], env: { TRAMA_TERMINAL: terminalId, PI_INTENT_TRACING: "1" }, cwd: root }),
    resumeLaunch: async (root, args, env) => ({ args, env: { ...env, QUESTION_ENDPOINT: "http://endpoint" }, cwd: root }),
    endWork: (terminalId, root) => ends.push([terminalId, root]),
    confirm: async () => {
      confirmations.asked++;
      return confirmations.answer;
    },
    install: () => undefined,
  };
  const general = new GeneralConversation(deps);
  return { general, client, view, store, confirmations, ends, usability };
}

describe("General in the host", () => {
  test("starts on activation with its own process and saves the session without a hook or advisor", async () => {
    const s = setup();
    s.general.start();
    await settle();
    expect(s.view.shown).toBe(1);
    expect(s.client.starts).toHaveLength(1);
    expect(s.client.starts[0]!.args).toEqual(["--append-system-prompt", "/ext/media/general.md", "acp"]);
    expect(s.view.last?.phase).toBe("ready");
    expect(s.view.last?.error).toBeUndefined();
    const record = s.store.get(GENERAL_KEY) as SavedGeneral;
    expect(record.sessionId).toBe("s1");
    expect(record.args).toEqual(["acp"]);
  });

  test("a missing omp shows the missing state and starts nothing", async () => {
    const s = setup({ installed: false });
    s.general.start();
    await settle();
    expect(s.client.starts).toHaveLength(0);
    expect(s.view.last).toEqual({ phase: "stopped", error: { kind: "missing" } });
    expect(s.confirmations.asked).toBe(0);
  });

  test("missing instructions in the package stop General before any start", async () => {
    const s = setup({ noInstructions: true });
    s.general.start();
    await settle();
    expect(s.client.starts).toHaveLength(0);
    expect(s.client.resumes).toHaveLength(0);
    expect(s.view.last?.phase).toBe("stopped");
    expect(s.view.last?.error?.kind).toBe("start");
  });

  test("a message after a failed start restarts General; if that fails too it comes back into the field, through the webview", async () => {
    const s = setup({ startFailures: 2 });
    s.general.start();
    await settle();
    expect(s.view.last?.phase).toBe("stopped");
    expect(s.view.last?.error?.kind).toBe("start");
    s.view.emit("message", sent("hello"));
    await settle();
    expect(s.client.starts).toHaveLength(2);
    expect(s.view.returned).toEqual([{ id: GENERAL_ID, text: "hello" }]);
    expect(s.view.last?.phase).toBe("stopped");
    // The returned message goes through the webview reducer: the field gets the text back.
    let state: ChatState = reduce(initialChatState(), { type: "conversations", items: [{ id: GENERAL_ID, name: "General", state: "idle", general: true }], selected: GENERAL_ID }, 0);
    for (const returned of s.view.returned) state = reduce(state, { type: "returnToField", id: returned.id, text: returned.text }, 1);
    expect(state.conversations[GENERAL_ID]?.returned?.text).toBe("hello");
  });

  test("a message in the ready state goes to the session as a prompt", async () => {
    const s = setup();
    s.general.start();
    await settle();
    s.view.emit("message", sent("hi"));
    await settle();
    expect(s.client.sessions[0]!.prompts).toEqual([{ text: "hi" }]);
  });

  test("a message while General's agent is in a turn goes to the session in the mode the view chose", async () => {
    const s = setup();
    s.general.start();
    await settle();
    s.client.sessions[0]!.inTurn = true;
    const statuses: string[] = [];
    s.view.emit("message", { text: "more", mode: "queue", report: (status: SendStatus) => statuses.push(status.status) });
    await settle();
    expect(s.client.sessions[0]!.sends).toEqual([{ prompt: { text: "more" }, mode: "queue" }]);
    expect(s.client.sessions[0]!.prompts).toEqual([]);
    expect(statuses).toEqual(["delivered"]);
  });

  test("clear asks first when the agent is in a turn, then stops the process and starts a new session", async () => {
    const s = setup({ answer: false });
    s.general.start();
    await settle();
    const first = s.client.sessions[0]!;
    first.inTurn = true;
    s.view.emit("clear");
    await settle();
    expect(s.confirmations.asked).toBe(1);
    expect(s.client.starts).toHaveLength(1);
    expect(first.stops).toBe(0);

    s.confirmations.answer = true;
    s.view.emit("clear");
    await settle();
    expect(s.confirmations.asked).toBe(2);
    expect(first.cancels).toBe(1);
    expect(first.stops).toBe(1);
    expect(s.view.cleared).toBe(1);
    expect(s.client.starts).toHaveLength(2);
    expect((s.store.get(GENERAL_KEY) as SavedGeneral).sessionId).toBe("s2");
  });

  test("clear with the agent idle does not ask", async () => {
    const s = setup();
    s.general.start();
    await settle();
    s.view.emit("clear");
    await settle();
    expect(s.confirmations.asked).toBe(0);
    expect(s.view.cleared).toBe(1);
  });

  test("a saved session is resumed without a prompt", async () => {
    const s = setup({ saved });
    s.general.start();
    await settle();
    expect(s.client.starts).toHaveLength(0);
    expect(s.client.resumes).toHaveLength(1);
    expect(s.client.resumes[0]!.sessionId).toBe("old");
    expect(s.client.resumes[0]!.launch.env.QUESTION_ENDPOINT).toBe("http://endpoint");
    expect(s.client.resumes[0]!.launch.args).toEqual(["--append-system-prompt", "/ext/media/general.md", "acp"]);
    expect(s.client.sessions[0]!.prompts).toEqual([]);
    expect(s.view.last?.phase).toBe("ready");
  });

  test("a saved session that does not come back is dropped and a new session starts", async () => {
    const s = setup({ saved, resumeFails: true });
    s.general.start();
    await settle();
    expect(s.client.resumes).toHaveLength(1);
    expect(s.client.starts).toHaveLength(1);
    expect(s.view.last?.phase).toBe("ready");
    expect((s.store.get(GENERAL_KEY) as SavedGeneral).sessionId).toBe("s1");
  });

  test("an exit that was not asked for stops General; the next message resumes its saved session", async () => {
    const s = setup();
    s.general.start();
    await settle();
    s.client.sessions[0]!.exit({ code: 1, signal: null });
    await settle();
    expect(s.view.last?.phase).toBe("stopped");
    expect(s.view.last?.error?.kind).toBe("exited");
    s.view.emit("message", sent("again"));
    await settle();
    expect(s.client.resumes).toHaveLength(1);
    expect(s.client.resumes[0]!.sessionId).toBe("s1");
    expect(s.client.sessions.at(-1)!.prompts).toEqual([{ text: "again" }]);
  });

  test("the end of the process, a clear and a close end General's work, as a terminal's end does", async () => {
    const s = setup();
    s.general.start();
    await settle();
    s.view.emit("clear");
    await settle();
    expect(s.ends.length).toBe(1);
    s.client.sessions.at(-1)!.exit({ code: 1, signal: null });
    await settle();
    expect(s.ends.length).toBe(2);
    s.view.emit("message", sent("again"));
    await settle();
    s.client.sessions.at(-1)!.inTurn = true;
    s.usability.usable = false;
    s.general.settingsChanged();
    await settle();
    expect(s.ends.length).toBe(2);
    s.view.emit("close", GENERAL_ID);
    await settle();
    expect(s.ends.length).toBe(3);
    expect(s.ends.every(([id, root]) => id !== "" && root === "/work/project")).toBe(true);
  });

  test("the window's close ends General's work too", async () => {
    const s = setup();
    s.general.start();
    await settle();
    const id = (s.store.values.get(GENERAL_KEY) as SavedGeneral).id;
    await s.general.windowClosed();
    expect(s.ends).toEqual([[id, "/work/project"]]);
  });

  test("a configured omp path that does not exist is missing, not a failed start", async () => {
    const s = setup({ realFindOmp: true, ompPath: "/nonexistent/omp" });
    s.general.start();
    await waitFor(() => s.view.last?.phase !== "starting");
    expect(s.client.starts).toHaveLength(0);
    expect(s.view.last).toEqual({ phase: "stopped", error: { kind: "missing" } });
  });
});
