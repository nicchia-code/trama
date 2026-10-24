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
  stopOptions: ({ deactivating?: boolean } | undefined)[] = [];
  async stop(options?: { deactivating?: boolean }): Promise<void> {
    this.stops++;
    this.stopOptions.push(options);
  }
  exit(exit: OmpExit): void {
    for (const listener of [...this.exitListeners]) listener(exit);
  }
  onExit(listener: (exit: OmpExit) => void): Disposable {
    this.exitListeners.push(listener);
    return { dispose: () => void (this.exitListeners = this.exitListeners.filter((l) => l !== listener)) };
  }
  onTurnEnd(): Disposable {
    return { dispose: () => undefined };
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
  /** The last lines of omp's error output that the failed starts carry. */
  startDetails: string | undefined;
  resumeFails = false;
  async start(launch: OmpLaunch): Promise<OmpSessionPort> {
    this.starts.push(launch);
    if (this.startFailures > 0) {
      this.startFailures--;
      throw new OmpStartFailure("omp exited with code 1", this.startDetails);
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

type Status = { phase: string; error?: { kind: string; reason?: string; details?: string }; newSession?: boolean };

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
  /** The reason the instructions file (with its language sentence) cannot be prepared: `instructions` throws it. */
  instructionsError?: string;
  /** What `omp --version` says of the installed omp: undefined for a recent one, `unreadable` for an omp whose version cannot be read, else the version. */
  version?: string | "unreadable";
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
  const interrupted: string[] = [];
  const checked: string[] = [];
  const deps: GeneralDeps = {
    client,
    view: view as unknown as ChatViewPort,
    store,
    folder: () => "/work/project",
    usable: () => usability.usable,
    ompPath: () => options.ompPath ?? "omp",
    findOmp: options.realFindOmp ? (ompPath) => findConfiguredOmp(ompPath, { PATH: "" }, "/nonexistent-home", false) : async () => (installed ? "/usr/local/bin/omp" : undefined),
    checkOmp: async (program) => {
      checked.push(program);
      if (options.version === undefined) return {};
      return options.version === "unreadable" ? { tooOld: true } : { tooOld: true, version: options.version };
    },
    instructions: () => {
      if (options.instructionsError !== undefined) throw new Error(options.instructionsError);
      return options.noInstructions ? undefined : "/ext/media/general.md";
    },
    launch: async (root, terminalId) => ({ args: ["acp"], env: { TRAMA_TERMINAL: terminalId, PI_INTENT_TRACING: "1" }, cwd: root }),
    resumeLaunch: async (root, args, env) => ({ args, env: { ...env, QUESTION_ENDPOINT: "http://endpoint" }, cwd: root }),
    endWork: (terminalId, root) => ends.push([terminalId, root]),
    confirm: async () => {
      confirmations.asked++;
      return confirmations.answer;
    },
    interruptRounds: (terminalId) => interrupted.push(terminalId),
    install: () => undefined,
  };
  const general = new GeneralConversation(deps);
  return { general, client, view, store, confirmations, ends, usability, interrupted, checked };
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
    // The terminal ID has the form of every terminal's, so the command line recognises it; it is saved with the entry.
    expect(record.id).toMatch(/^[a-z0-9]{6}$/);
    expect(s.client.starts[0]!.env["TRAMA_TERMINAL"]).toBe(record.id);
  });

  test("a missing omp shows the missing state and starts nothing", async () => {
    const s = setup({ installed: false });
    s.general.start();
    await settle();
    expect(s.client.starts).toHaveLength(0);
    expect(s.view.last).toEqual({ phase: "stopped", error: { kind: "missing" } });
    expect(s.confirmations.asked).toBe(0);
  });

  test("an omp older than the minimum, or whose version cannot be read, starts nothing and says so as General's error line, with Install omp and no editor notice", async () => {
    const old = setup({ version: "18.12.5" });
    old.general.start();
    await settle();
    expect(old.checked).toEqual(["/usr/local/bin/omp"]);
    expect(old.client.starts).toHaveLength(0);
    expect(old.client.resumes).toHaveLength(0);
    expect(old.view.last).toEqual({ phase: "stopped", error: { kind: "missing", reason: "Trama needs omp 18.12.6 or later; the installed omp is 18.12.5." } });
    expect(old.confirmations.asked).toBe(0);

    const unreadable = setup({ version: "unreadable" });
    unreadable.general.start();
    await settle();
    expect(unreadable.view.last).toEqual({ phase: "stopped", error: { kind: "missing", reason: "Trama needs omp 18.12.6 or later; the installed omp is unknown." } });

    // A missing omp is not looked at: the check comes after the program is found.
    const missing = setup({ installed: false, version: "18.12.5" });
    missing.general.start();
    await settle();
    expect(missing.checked).toEqual([]);
    expect(missing.view.last).toEqual({ phase: "stopped", error: { kind: "missing" } });
  });

  test("a saved session is checked too before it resumes: with an omp that is too old it does not come back, and the start that follows says why", async () => {
    const s = setup({ saved, version: "18.12.5" });
    s.general.start();
    await settle();
    expect(s.client.resumes).toHaveLength(0);
    expect(s.client.starts).toHaveLength(0);
    expect(s.store.get(GENERAL_KEY)).toBeUndefined();
    expect(s.view.last).toEqual({ phase: "stopped", error: { kind: "missing", reason: "Trama needs omp 18.12.6 or later; the installed omp is 18.12.5." } });
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

  test("instructions that cannot be prepared (the copy with the language sentence) stop General before any start, with the reason", async () => {
    const s = setup({ instructionsError: "disk full" });
    s.general.start();
    await settle();
    expect(s.client.starts).toHaveLength(0);
    expect(s.view.last?.phase).toBe("stopped");
    expect(s.view.last?.error).toMatchObject({ kind: "start", reason: "its instructions could not be prepared: disk full" });
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

  test("the rounds its agent asked end with its Stop, its clear and the end of its process", async () => {
    const s = setup();
    s.general.start();
    await settle();
    const id = (s.store.get(GENERAL_KEY) as SavedGeneral).id;
    s.view.emit("stop", GENERAL_ID);
    await settle();
    expect(s.client.sessions[0]!.cancels).toBe(1);
    expect(s.interrupted).toEqual([id]);
    s.view.emit("clear");
    await settle();
    expect(s.interrupted).toEqual([id, id]);
    const second = (s.store.get(GENERAL_KEY) as SavedGeneral).id;
    s.client.sessions.at(-1)!.exit({ code: 1, signal: null });
    await settle();
    expect(s.interrupted).toEqual([id, id, second]);
  });

  test("General owns the identity of its process only while the process runs", async () => {
    const s = setup();
    expect(s.general.owns("abc123")).toBe(false);
    s.general.start();
    await settle();
    const id = (s.store.get(GENERAL_KEY) as SavedGeneral).id;
    expect(s.general.owns(id)).toBe(true);
    expect(s.general.owns("zzzzzz")).toBe(false);
    s.client.sessions[0]!.exit({ code: 1, signal: null });
    await settle();
    expect(s.general.owns(id)).toBe(false);
  });

  test("the window's close ends General's work too", async () => {
    const s = setup();
    s.general.start();
    await settle();
    const id = (s.store.values.get(GENERAL_KEY) as SavedGeneral).id;
    await s.general.windowClosed();
    expect(s.ends).toEqual([[id, "/work/project"]]);
    // The window's close is a deactivation: the session is not closed first. A clear is not.
    expect(s.client.sessions[0]!.stopOptions).toEqual([{ deactivating: true }]);
  });

  test("a clear stops the process without the deactivation option", async () => {
    const s = setup();
    s.general.start();
    await settle();
    s.view.emit("clear");
    await settle();
    expect(s.client.sessions[0]!.stopOptions).toEqual([undefined]);
  });

  test("a failed start and an exit show the last lines of omp's error output inside the conversation", async () => {
    const s = setup({ startFailures: 1 });
    s.client.startDetails = "error: no API key\nrun omp login";
    s.general.start();
    await settle();
    expect(s.view.last).toEqual({ phase: "stopped", error: { kind: "start", reason: "omp exited with code 1", details: "error: no API key\nrun omp login" } });
    s.view.emit("message", sent("again"));
    await settle();
    s.client.sessions.at(-1)!.exit({ code: 2, signal: null, details: "panic: out of memory" });
    await settle();
    expect(s.view.last?.error).toEqual({ kind: "exited", reason: "its command exited with code 2", details: "panic: out of memory" });
    // Without output of error there is no `details`.
    s.view.emit("message", sent("once more"));
    await settle();
    s.client.sessions.at(-1)!.exit({ code: 3, signal: null });
    await settle();
    expect(s.view.last?.error).toEqual({ kind: "exited", reason: "its command exited with code 3" });
  });

  test("General is followed under its identity while it has a process or a saved session, for the execution check of every window", async () => {
    const s = setup();
    expect(s.general.follows("t1")).toBe(false);
    s.general.start();
    await settle();
    const id = (s.store.values.get(GENERAL_KEY) as SavedGeneral).id;
    expect(s.general.follows(id)).toBe(true);
    expect(s.general.follows("other1")).toBe(false);
    // The process exited by itself: the saved session is still General's, resumed by the next message.
    s.client.sessions[0]!.exit({ code: 1, signal: null });
    await settle();
    expect(s.general.follows(id)).toBe(true);
    // Clearing drops the session: the identity it had is nobody's any more.
    s.view.emit("clear");
    await settle();
    expect(s.general.follows(id)).toBe(false);
    expect(s.general.follows((s.store.values.get(GENERAL_KEY) as SavedGeneral).id)).toBe(true);
  });

  test("a saved General keeps its identity when it resumes, and is followed as soon as the window opens", async () => {
    const s = setup({ saved });
    s.general.start();
    expect(s.general.follows("t1")).toBe(true);
    await settle();
    expect(s.client.resumes).toHaveLength(1);
    expect((s.store.values.get(GENERAL_KEY) as SavedGeneral).id).toBe("t1");
    expect(s.general.follows("t1")).toBe(true);
  });

  test("a configured omp path that does not exist is missing, not a failed start", async () => {
    const s = setup({ realFindOmp: true, ompPath: "/nonexistent/omp" });
    s.general.start();
    await waitFor(() => s.view.last?.phase !== "starting");
    expect(s.client.starts).toHaveLength(0);
    expect(s.view.last).toEqual({ phase: "stopped", error: { kind: "missing" } });
  });
});
