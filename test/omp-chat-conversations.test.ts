import { beforeEach, describe, expect, test, vi } from "bun:test";
import { CONVERSATIONS_KEY, RESUME_PROMPT, type SavedConversation, type TurnEnd } from "../src/core/omp-chat-conversation";
import { type ConversationHooks, type ConversationInfo, type ConversationStore, OmpConversations } from "../extension/src/host/omp-chat/conversations";
import { type ChatViewPort, type Disposable, type OmpClientPort, type OmpExit, type OmpLaunch, type OmpPrompt, OmpStartFailure, type OmpSessionPort, type PendingInstruction } from "../extension/src/host/omp-chat/ports";
import { instructedMessage } from "../extension/src/host/prompts";

class FakeSession implements OmpSessionPort {
  pid: number | undefined = 4242;
  inTurn = true;
  prompts: OmpPrompt[] = [];
  cancels = 0;
  stops = 0;
  /** The options of each stop: `{ deactivating: true }` for the one the closing window asks. */
  stopOptions: ({ deactivating?: boolean } | undefined)[] = [];
  private exitListeners: ((exit: OmpExit) => void)[] = [];
  private turnEndListeners: ((end: TurnEnd) => void)[] = [];
  constructor(readonly sessionId: string) {}
  async sendPrompt(prompt: OmpPrompt): Promise<void> {
    this.prompts.push(prompt);
  }
  async send(prompt: OmpPrompt): Promise<void> {
    this.prompts.push(prompt);
  }
  cancel(): void {
    this.cancels++;
  }
  async stop(options?: { deactivating?: boolean }): Promise<void> {
    this.stops++;
    this.stopOptions.push(options);
  }
  onExit(listener: (exit: OmpExit) => void): Disposable {
    this.exitListeners.push(listener);
    return { dispose: () => void (this.exitListeners = this.exitListeners.filter((l) => l !== listener)) };
  }
  onTurnEnd(listener: (end: TurnEnd) => void): Disposable {
    this.turnEndListeners.push(listener);
    return { dispose: () => void (this.turnEndListeners = this.turnEndListeners.filter((l) => l !== listener)) };
  }
  /** omp answers the prompt of the work. */
  turnEnd(end: TurnEnd = { stopReason: "end_turn" }): void {
    for (const listener of [...this.turnEndListeners]) listener(end);
  }
  get listeningToTurnEnd(): boolean {
    return this.turnEndListeners.length > 0;
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
  onPermissionCancelled(): Disposable {
    return { dispose: () => undefined };
  }
  answerPermission(): void {}
  async models(): Promise<{ available: { id: string; name: string }[] }> {
    return { available: [] };
  }
  async setModel(): Promise<void> {}
  exit(exit: OmpExit): void {
    for (const listener of this.exitListeners) listener(exit);
  }
}

class FakeClient implements OmpClientPort {
  started: { launch: OmpLaunch; first?: OmpPrompt }[] = [];
  resumed: { launch: OmpLaunch; sessionId: string }[] = [];
  sessions: FakeSession[] = [];
  failStart: string | undefined;
  /** The details (the last lines of omp's error output) a failed start or resume carries. */
  failDetails: string | undefined;
  /** What a resume does: a session, a failure or silence. */
  resumeWith: "ok" | "fail" | "silent" | "late" = "ok";
  lateSession: FakeSession | undefined;
  /** Lets the late resume answer. */
  releaseLate: (() => void) | undefined;
  async start(launch: OmpLaunch, first?: OmpPrompt, spawned?: (pid: number) => void): Promise<OmpSessionPort> {
    this.started.push({ launch, ...(first === undefined ? {} : { first }) });
    // The process stands the moment it is spawned, before the session opens.
    spawned?.(4242);
    if (this.failStart !== undefined) throw new OmpStartFailure(this.failStart, this.failDetails);
    const session = new FakeSession(`session-${this.sessions.length + 1}`);
    this.sessions.push(session);
    return session;
  }
  async resume(launch: OmpLaunch, sessionId: string, spawned?: (pid: number) => void): Promise<OmpSessionPort> {
    this.resumed.push({ launch, sessionId });
    spawned?.(4343);
    if (this.resumeWith === "fail") throw new OmpStartFailure("session not found", this.failDetails);
    if (this.resumeWith === "silent") return new Promise<never>(() => undefined);
    const session = new FakeSession(sessionId);
    this.sessions.push(session);
    if (this.resumeWith === "late") {
      this.lateSession = session;
      const { promise, resolve } = Promise.withResolvers<OmpSessionPort>();
      this.releaseLate = () => resolve(session);
      return promise;
    }
    return session;
  }
}

class FakeView implements ChatViewPort {
  opened: { id: string; name: string; focus: boolean; notice?: string }[] = [];
  working = new Map<string, boolean>();
  /** The Ask more instructions held per conversation, and the session attached to each tab. */
  instructions = new Map<string, PendingInstruction>();
  attached = new Map<string, OmpSessionPort>();
  closed: string[] = [];
  private stopListeners: ((id: string) => void)[] = [];
  private closeListeners: ((id: string) => void)[] = [];
  open(tab: { id: string; name: string }, session: OmpSessionPort | undefined, options: { focus: boolean; notice?: string; instruction?: PendingInstruction }): void {
    this.opened.push({ ...tab, focus: options.focus, ...(options.notice === undefined ? {} : { notice: options.notice }) });
    if (options.instruction !== undefined) this.instructions.set(tab.id, options.instruction);
    if (session !== undefined) this.attached.set(tab.id, session);
  }
  setSession(id: string, session: OmpSessionPort): void {
    this.attached.set(id, session);
  }
  setWorking(id: string, working: boolean): void {
    this.working.set(id, working);
  }
  close(id: string): void {
    this.closed.push(id);
  }
  onStopRequested(listener: (id: string) => void): Disposable {
    this.stopListeners.push(listener);
    return { dispose() {} };
  }
  onCloseRequested(listener: (id: string) => void): Disposable {
    this.closeListeners.push(listener);
    return { dispose() {} };
  }
  pressStop(id: string): void {
    for (const listener of this.stopListeners) listener(id);
  }
  pressClose(id: string): void {
    for (const listener of this.closeListeners) listener(id);
  }
  returnToField(): void {}
  showGeneral(): void {}
  setGeneralSession(): void {}
  generalStatus(): void {}
  generalCleared(): void {}
  removeGeneral(): void {}
  onClearGeneralRequested(): Disposable {
    return { dispose() {} };
  }
  onInstallOmpRequested(): Disposable {
    return { dispose() {} };
  }
  onGeneralMessage(): Disposable {
    return { dispose() {} };
  }
}

class FakeStore implements ConversationStore {
  values = new Map<string, unknown>();
  get(key: string): unknown {
    return this.values.get(key);
  }
  async update(key: string, value: unknown): Promise<void> {
    this.values.set(key, JSON.parse(JSON.stringify(value)));
  }
  get saved(): SavedConversation[] {
    return (this.values.get(CONVERSATIONS_KEY) as SavedConversation[] | undefined) ?? [];
  }
}

interface Calls {
  ended: { id: string; abnormal?: string }[];
  stopped: { name: string; reason: string; details?: string }[];
  agentStopped: { name: string; reason: string }[];
  registered: { id: string; pid: number }[];
  unregistered: string[];
  interrupted: string[];
  restored: { id: string; job: string }[];
  confirms: { message: string; detail: string; button: string }[];
}

let client: FakeClient;
let view: FakeView;
let store: FakeStore;
let calls: Calls;
let autoExit: boolean;
let confirmAnswer: boolean;
let projectRoot: string | undefined;

const hooks = (): ConversationHooks => ({
  autoExit: () => autoExit,
  endWork: (conversation: ConversationInfo, abnormal?: string) => calls.ended.push({ id: conversation.id, ...(abnormal === undefined ? {} : { abnormal }) }),
  reportStopped: (name, reason, details) => calls.stopped.push({ name, reason, ...(details === undefined ? {} : { details }) }),
  reportAgentStopped: (name, reason) => calls.agentStopped.push({ name, reason }),
  registerProcess: (conversation, pid) => calls.registered.push({ id: conversation.id, pid }),
  unregisterProcess: (conversation) => calls.unregistered.push(conversation.id),
  interruptQuestions: (conversation) => calls.interrupted.push(conversation.id),
  restoreJob: (conversation, job) => calls.restored.push({ id: conversation.id, job: job.id }),
  projectRoot: () => projectRoot,
  resumeLaunch: async (root, args, env) => ({ args, env: { ...env, QUESTION_ENDPOINT: "fresh" }, cwd: root }),
  confirm: async (message, detail, button) => {
    calls.confirms.push({ message, detail, button });
    return confirmAnswer;
  },
});

/** Lets the promise chains the host started settle. */
const flush = async (): Promise<void> => {
  for (let i = 0; i < 10; i++) await Promise.resolve();
};

const make = () => new OmpConversations(client, view, store, hooks());
const launch: OmpLaunch = { args: ["--hook", "/h.js", "acp", "--yolo"], env: { TRAMA_AGENT: "1", TRAMA_TERMINAL: "abc123", TRAMA_JOB: "job-1", QUESTION_ENDPOINT: "old", PATH: "/cli:/bin" }, cwd: "/p" };
const job = { id: "job-1", kind: "run" as const, name: "T3", announcement: "ann-1" };
const spec = { id: "abc123", root: "/p", name: "T3", launch, first: { text: "Do it" }, focus: false, hook: true, job };

beforeEach(() => {
  client = new FakeClient();
  view = new FakeView();
  store = new FakeStore();
  calls = { ended: [], stopped: [], agentStopped: [], registered: [], unregistered: [], interrupted: [], restored: [], confirms: [] };
  autoExit = true;
  confirmAnswer = true;
  projectRoot = "/p";
});

describe("opening", () => {
  test("starts the process with the job's launch and instruction as the first message, shows the tab and saves the entry", async () => {
    const conversations = make();
    expect(await conversations.open(spec)).toEqual({ opened: true });
    expect(client.started).toEqual([{ launch: { ...launch, hook: true }, first: { text: "Do it" } }]);
    expect(view.opened).toEqual([{ id: "abc123", name: "T3", focus: false }]);
    expect(view.working.get("abc123")).toBe(true);
    expect(calls.registered).toEqual([{ id: "abc123", pid: 4242 }]);
    expect(store.saved).toEqual([
      { id: "abc123", name: "T3", sessionId: "session-1", state: "running", args: launch.args, env: { TRAMA_AGENT: "1", TRAMA_TERMINAL: "abc123", TRAMA_JOB: "job-1" }, hook: true, job, openedAt: expect.any(String) },
    ]);
  });

  test("Ask more focuses the field and has no job in its entry", async () => {
    const conversations = make();
    await conversations.open({ id: "qqq111", root: "/p", name: "Ask", launch: { ...launch, args: ["acp", "--yolo"] }, focus: true, hook: false });
    expect(client.started[0]?.first).toBeUndefined();
    expect(client.started[0]?.launch.hook).toBe(false);
    expect(view.opened[0]?.focus).toBe(true);
    expect(store.saved[0]?.job).toBeUndefined();
    expect(store.saved[0]?.hook).toBe(false);
  });

  test("a failed start opens nothing, saves nothing, ends nothing, forgets the process and gives the reason and omp's error output for the terminal", async () => {
    client.failStart = "omp exited with code 1";
    client.failDetails = "boom: no credentials";
    const conversations = make();
    expect(await conversations.open(spec)).toEqual({ opened: false, reason: "omp exited with code 1", details: "boom: no credentials" });
    expect(view.opened).toEqual([]);
    expect(store.saved).toEqual([]);
    expect(calls.ended).toEqual([]);
    expect(conversations.has("abc123")).toBe(false);
    expect(calls.registered).toEqual([{ id: "abc123", pid: 4242 }]);
    expect(calls.unregistered).toEqual(["abc123"]);
  });

  test("the process is registered the moment it is spawned, before the session is open", async () => {
    const conversations = make();
    const pending = conversations.open(spec);
    expect(calls.registered).toEqual([{ id: "abc123", pid: 4242 }]);
    await pending;
  });

  test("two conversations work together, each with its own process", async () => {
    const conversations = make();
    await conversations.open(spec);
    await conversations.open({ ...spec, id: "def456", name: "Design", job: { ...job, id: "job-2" } });
    expect(client.sessions).toHaveLength(2);
    expect(store.saved.map((e) => e.id)).toEqual(["abc123", "def456"]);
  });
});

const heldLaunch: OmpLaunch = { args: ["acp", "--yolo"], env: { TRAMA_AGENT: "1", TRAMA_TERMINAL: "qqq111", QUESTION_ENDPOINT: "old", PATH: "/cli:/bin" }, cwd: "/p" };
/** An Ask more conversation: no job, its instruction held until the first message. */
const held = (announced: string[]) => ({
  id: "qqq111",
  root: "/p",
  name: "Ask",
  launch: heldLaunch,
  focus: true,
  hook: false,
  instruction: {
    placeholder: "Ask about T3 – Steer…",
    compose: (message: string) => ({ text: instructedMessage("PART", message), attachment: "/media/ask-more.md" }),
    announce: () => void announced.push("work"),
  },
});

describe("Ask more's held instruction", () => {
  test("the tab opens at once, omp starts with no message, and nothing is sent, saved or announced", async () => {
    const announced: string[] = [];
    const conversations = make();
    const pending = conversations.open(held(announced));
    expect(view.opened).toEqual([{ id: "qqq111", name: "Ask", focus: true }]);
    expect(view.instructions.get("qqq111")?.placeholder).toBe("Ask about T3 – Steer…");
    expect(await pending).toEqual({ opened: true });
    expect(client.started).toEqual([{ launch: { ...heldLaunch, hook: false } }]);
    expect(client.sessions[0]?.prompts).toEqual([]);
    expect(view.attached.get("qqq111")).toBe(client.sessions[0]);
    expect(store.saved).toEqual([]);
    expect(announced).toEqual([]);
    expect(view.working.get("qqq111")).toBeUndefined();
  });

  test("the first message goes out with the instruction in one prompt; the work is announced then and the conversation saved", async () => {
    const announced: string[] = [];
    const conversations = make();
    await conversations.open(held(announced));
    const instruction = view.instructions.get("qqq111");
    if (instruction === undefined) throw new Error("the instruction is not held");
    const prompt = instruction.compose("Why does it fail?");
    expect(prompt).toEqual({ text: "Instructions from Trama (not written by the developer):\nPART\n\nDeveloper's message:\nWhy does it fail?", attachment: "/media/ask-more.md" });
    expect(announced).toEqual([]);
    instruction.sent();
    await view.attached.get("qqq111")?.send(prompt, "steer", () => undefined);
    expect(announced).toEqual(["work"]);
    expect(client.sessions[0]?.prompts).toEqual([prompt]);
    expect(view.working.get("qqq111")).toBe(true);
    expect(store.saved).toEqual([{ id: "qqq111", name: "Ask", sessionId: "session-1", state: "running", args: heldLaunch.args, env: { TRAMA_AGENT: "1", TRAMA_TERMINAL: "qqq111" }, hook: false, openedAt: expect.any(String) }]);
  });

  test("a conversation closed before any message leaves no trace: no dialog, no notice, nothing saved or announced", async () => {
    const announced: string[] = [];
    const conversations = make();
    await conversations.open(held(announced));
    const session = client.sessions[0];
    if (session === undefined) throw new Error("omp was not started");
    session.inTurn = false;
    await conversations.closeRequested("qqq111");
    expect(calls.confirms).toEqual([]);
    expect(calls.stopped).toEqual([]);
    expect(view.closed).toEqual(["qqq111"]);
    expect(conversations.has("qqq111")).toBe(false);
    expect(store.saved).toEqual([]);
    expect(announced).toEqual([]);
  });

  test("a window closed before any message keeps nothing", async () => {
    const conversations = make();
    await conversations.open(held([]));
    await conversations.windowClosed();
    expect(store.saved).toEqual([]);
  });

  test("a failed start leaves no conversation: the tab closes and the reason goes back for the terminal", async () => {
    client.failStart = "omp exited with code 1";
    const conversations = make();
    expect(await conversations.open(held([]))).toEqual({ opened: false, reason: "omp exited with code 1" });
    expect(calls.unregistered).toEqual(["qqq111"]);
    expect(view.closed).toEqual(["qqq111"]);
    expect(conversations.has("qqq111")).toBe(false);
    expect(store.saved).toEqual([]);
  });
});

describe("the end of the turn", () => {
  test("omp's answer to the prompt of the work, with autoExit on, ends the work, stops the process and the conversation goes", async () => {
    const conversations = make();
    await conversations.open(spec);
    client.sessions[0]?.turnEnd();
    expect(calls.ended).toEqual([{ id: "abc123" }]);
    expect(calls.agentStopped).toEqual([]);
    expect(client.sessions[0]?.stops).toBe(1);
    expect(view.closed).toEqual(["abc123"]);
    expect(store.saved).toEqual([]);
    expect(conversations.has("abc123")).toBe(false);
  });

  test("with autoExit off, the work ends and the conversation stays idle, saved as idle", async () => {
    autoExit = false;
    const conversations = make();
    await conversations.open(spec);
    client.sessions[0]?.turnEnd();
    expect(calls.ended).toEqual([{ id: "abc123" }]);
    expect(client.sessions[0]?.stops).toBe(0);
    expect(view.closed).toEqual([]);
    expect(store.saved[0]?.state).toBe("idle");
    expect(store.saved[0]?.job).toBeUndefined();
    expect(view.working.get("abc123")).toBe(false);
    // Not followed any more: a later end of turn ends nothing.
    client.sessions[0]?.turnEnd({ stopReason: "refusal" });
    expect(calls.ended).toHaveLength(1);
    expect(calls.agentStopped).toEqual([]);
  });

  test("an abnormal end ends the work with the reason and puts the notice on the Board, with the job's name", async () => {
    const conversations = make();
    await conversations.open(spec);
    client.sessions[0]?.turnEnd({ stopReason: "max_tokens" });
    expect(calls.ended).toEqual([{ id: "abc123", abnormal: "the model reached its token limit" }]);
    expect(calls.agentStopped).toEqual([{ name: "T3", reason: "the model reached its token limit" }]);
    expect(view.closed).toEqual(["abc123"]);
  });

  test("a prompt omp refuses ends the job with omp's reason instead of leaving it running", async () => {
    autoExit = false;
    const conversations = make();
    await conversations.open(spec);
    client.sessions[0]?.turnEnd({ error: "no credentials" });
    expect(calls.ended).toEqual([{ id: "abc123", abnormal: "omp refused the prompt (no credentials)" }]);
    expect(calls.agentStopped).toEqual([{ name: "T3", reason: "omp refused the prompt (no credentials)" }]);
    expect(store.saved[0]?.state).toBe("idle");
  });

  test("Stop's cancelled answer is a normal end: no notice", async () => {
    const conversations = make();
    await conversations.open(spec);
    client.sessions[0]?.turnEnd({ stopReason: "cancelled" });
    expect(calls.ended).toEqual([{ id: "abc123" }]);
    expect(calls.agentStopped).toEqual([]);
  });

  test("an end of another conversation changes nothing", async () => {
    const conversations = make();
    await conversations.open(spec);
    await conversations.open({ ...spec, id: "def456", name: "Design", job: { ...job, id: "job-2" } });
    client.sessions[1]?.turnEnd();
    expect(calls.ended).toEqual([{ id: "def456" }]);
    expect(conversations.has("abc123")).toBe(true);
  });

  test("a conversation without a job (Ask more) is not followed to a turn end", async () => {
    const conversations = make();
    await conversations.open({ id: "qqq111", root: "/p", name: "Ask", launch: { ...launch, args: ["acp", "--yolo"] }, focus: true, hook: false });
    expect((client.sessions[0] as FakeSession).listeningToTurnEnd).toBe(false);
  });

  test("a job whose package has no hook module still ends on omp's answer", async () => {
    const conversations = make();
    await conversations.open({ ...spec, hook: false });
    expect(client.started[0]?.launch.hook).toBe(false);
    client.sessions[0]?.turnEnd();
    expect(calls.ended).toEqual([{ id: "abc123" }]);
  });
});

describe("the end of the process", () => {
  test("an unasked end closes the conversation and ends the work as the end of a command does, with autoExit on or off, and the Board says why with omp's error output", async () => {
    for (const exitAuto of [true, false]) {
      autoExit = exitAuto;
      calls.ended.length = 0;
      calls.stopped.length = 0;
      const conversations = make();
      await conversations.open({ ...spec, id: `x${exitAuto ? 1 : 0}0000` });
      client.sessions.at(-1)?.exit({ code: 1, signal: null, details: "fatal: out of memory" });
      expect(calls.ended).toEqual([{ id: `x${exitAuto ? 1 : 0}0000`, abnormal: "its command exited with code 1" }]);
      expect(calls.stopped).toEqual([{ name: "T3", reason: "omp exited (code 1)", details: "fatal: out of memory" }]);
      expect(client.sessions.at(-1)?.stops).toBe(1);
    }
  });

  test("a process that ended with code 0 before omp answered is still reported on the Board", async () => {
    const conversations = make();
    await conversations.open(spec);
    client.sessions[0]?.exit({ code: 0, signal: null });
    expect(calls.ended).toEqual([{ id: "abc123" }]);
    expect(calls.stopped).toEqual([{ name: "T3", reason: "omp exited (code 0)" }]);
    expect(calls.interrupted).toEqual(["abc123"]);
    expect(view.closed).toEqual(["abc123"]);
    expect(store.saved).toEqual([]);
  });

  test("a connection that closed with no exit status says only that omp exited", async () => {
    const conversations = make();
    await conversations.open(spec);
    client.sessions[0]?.exit({ code: null, signal: null });
    expect(calls.stopped).toEqual([{ name: "T3", reason: "omp exited" }]);
    expect(calls.ended).toEqual([{ id: "abc123", abnormal: "its command ended without an exit status" }]);
  });

  test("an idle conversation's process ending closes it, without a notice", async () => {
    autoExit = false;
    const conversations = make();
    await conversations.open(spec);
    client.sessions[0]?.turnEnd();
    client.sessions[0]?.exit({ code: null, signal: "SIGKILL" });
    expect(calls.interrupted).toEqual(["abc123"]);
    expect(view.closed).toEqual(["abc123"]);
    expect(store.saved).toEqual([]);
    expect(calls.stopped).toEqual([]);
  });

  test("an end after the conversation closed is ignored", async () => {
    const conversations = make();
    await conversations.open(spec);
    const session = client.sessions[0] as FakeSession;
    session.turnEnd();
    session.exit({ code: 1, signal: null });
    expect(calls.ended).toHaveLength(1);
    // The turn ended and closed the conversation: the exit that follows asks nothing of the rounds.
    expect(calls.interrupted).toEqual([]);
    expect(calls.stopped).toEqual([]);
  });
});

describe("Stop and close", () => {
  test("Stop asks, then cancels the turn and stays running; cancelling the dialog does nothing", async () => {
    const conversations = make();
    await conversations.open(spec);
    confirmAnswer = false;
    await conversations.stopRequested("abc123");
    expect(client.sessions[0]?.cancels).toBe(0);
    confirmAnswer = true;
    await conversations.stopRequested("abc123");
    expect(calls.confirms.at(-1)).toEqual({ message: "Stop the agent in T3?", detail: "The agent stops its current turn.", button: "Stop" });
    expect(client.sessions[0]?.cancels).toBe(1);
    // What follows is decided by omp's answer to the prompt: the question round the conversation waited on is interrupted, nothing else ends.
    expect(calls.interrupted).toEqual(["abc123"]);
    expect(calls.ended).toEqual([]);
    expect(conversations.has("abc123")).toBe(true);
  });

  test("the view's Stop and close buttons reach the host", async () => {
    const conversations = make();
    await conversations.open(spec);
    view.pressStop("abc123");
    await flush();
    expect(client.sessions[0]?.cancels).toBe(1);
    view.pressClose("abc123");
    await flush();
    expect(view.closed).toEqual(["abc123"]);
  });

  test("closing in a turn asks, then stops the process and ends the work as a closed terminal does", async () => {
    const conversations = make();
    await conversations.open(spec);
    await conversations.closeRequested("abc123");
    expect(calls.confirms).toEqual([{ message: "Close T3 and stop its agent?", detail: "The conversation and its agent end; Trama stops following its job.", button: "Close" }]);
    expect(client.sessions[0]?.stops).toBe(1);
    expect(calls.ended).toEqual([{ id: "abc123", abnormal: "its conversation was closed" }]);
    // The rounds its agent asked end with the conversation.
    expect(calls.interrupted).toEqual(["abc123"]);
    expect(view.closed).toEqual(["abc123"]);
    expect(store.saved).toEqual([]);
  });

  test("a cancelled close changes nothing", async () => {
    confirmAnswer = false;
    const conversations = make();
    await conversations.open(spec);
    await conversations.closeRequested("abc123");
    expect(view.closed).toEqual([]);
    expect(client.sessions[0]?.stops).toBe(0);
    expect(conversations.has("abc123")).toBe(true);
  });

  test("a conversation at rest and not in a turn closes without the dialog", async () => {
    autoExit = false;
    const conversations = make();
    await conversations.open(spec);
    client.sessions[0]?.turnEnd();
    const session = client.sessions[0] as FakeSession;
    session.inTurn = false;
    await conversations.closeRequested("abc123");
    expect(calls.confirms).toEqual([]);
    expect(session.stops).toBe(1);
    expect(view.closed).toEqual(["abc123"]);
  });

  test("an idle conversation in a turn for the developer's message asks before closing; Stop cancels its turn", async () => {
    autoExit = false;
    const conversations = make();
    await conversations.open(spec);
    client.sessions[0]?.turnEnd();
    await conversations.stopRequested("abc123");
    expect(client.sessions[0]?.cancels).toBe(1);
    // The rounds the agent asked in that turn end with it.
    expect(calls.interrupted).toEqual(["abc123"]);
    await conversations.closeRequested("abc123");
    expect(calls.confirms.at(-1)?.button).toBe("Close");
    expect(view.closed).toEqual(["abc123"]);
  });
});

describe("the window closing", () => {
  test("stops every process and keeps the saved entries and the work", async () => {
    const conversations = make();
    await conversations.open(spec);
    await conversations.open({ ...spec, id: "def456", name: "Design", job: { ...job, id: "job-2" } });
    await conversations.windowClosed();
    expect(client.sessions.map((s) => s.stops)).toEqual([1, 1]);
    // The window is closing: there is little time, so omp's session is not closed first.
    expect(client.sessions.map((s) => s.stopOptions)).toEqual([[{ deactivating: true }], [{ deactivating: true }]]);
    expect(calls.ended).toEqual([]);
    expect(view.closed).toEqual([]);
    expect(store.saved.map((e) => e.id)).toEqual(["abc123", "def456"]);
  });

  test("an idle conversation is kept as idle", async () => {
    autoExit = false;
    const conversations = make();
    await conversations.open(spec);
    client.sessions[0]?.turnEnd();
    await conversations.windowClosed();
    expect(store.saved[0]?.state).toBe("idle");
    expect(store.saved[0]?.job).toBeUndefined();
  });

  test("a conversation with no hook is saved as working only when its agent was in a turn", async () => {
    const conversations = make();
    await conversations.open({ id: "qqq111", root: "/p", name: "Ask", launch: { ...launch, args: ["acp", "--yolo"] }, focus: true, hook: false });
    await conversations.open({ id: "aaa222", root: "/p", name: "Ask P2", launch: { ...launch, args: ["acp", "--yolo"] }, focus: true, hook: false });
    (client.sessions[1] as FakeSession).inTurn = false;
    await conversations.windowClosed();
    expect(store.saved.map((e) => [e.id, e.state])).toEqual([["qqq111", "running"], ["aaa222", "idle"]]);
  });
});

describe("the resume", () => {
  const entry = (patch: Partial<SavedConversation> = {}): SavedConversation => ({
    id: "abc123",
    name: "T3",
    sessionId: "session-1",
    state: "running",
    args: ["--hook", "/h.js", "acp", "--yolo"],
    env: { TRAMA_AGENT: "1", TRAMA_ACP: "1", TRAMA_TERMINAL: "abc123", TRAMA_JOB: "job-1" },
    hook: true,
    job,
    openedAt: "2026-10-23T10:00:00.000Z",
    ...patch,
  });
  const saveEntries = (...entries: unknown[]) => void store.values.set(CONVERSATIONS_KEY, entries);

  test("a working conversation reopens with the same arguments and identity, shows the notice and gets the fixed prompt; its Task stays held and its job stands", async () => {
    saveEntries(entry());
    const conversations = make();
    await conversations.resume();
    expect(client.resumed).toEqual([{ launch: { args: ["--hook", "/h.js", "acp", "--yolo"], env: { TRAMA_AGENT: "1", TRAMA_ACP: "1", TRAMA_TERMINAL: "abc123", TRAMA_JOB: "job-1", QUESTION_ENDPOINT: "fresh" }, cwd: "/p", hook: true }, sessionId: "session-1" }]);
    // The new process is recorded like at the opening, as soon as it is spawned.
    expect(calls.registered).toEqual([{ id: "abc123", pid: 4343 }]);
    expect(conversations.followsJob("abc123")).toBe(true);
    expect(calls.restored).toEqual([{ id: "abc123", job: "job-1" }]);
    expect(view.opened).toEqual([{ id: "abc123", name: "T3", focus: false, notice: "The window reloaded; the agent continues its work." }]);
    expect((client.sessions[0] as FakeSession).prompts).toEqual([{ text: RESUME_PROMPT, work: true }]);
    expect(calls.ended).toEqual([]);
    expect(store.saved[0]?.state).toBe("running");
  });

  test("a resting conversation comes back idle with no prompt, unfollowed", async () => {
    saveEntries(entry({ state: "idle" }));
    const conversations = make();
    await conversations.resume();
    expect(conversations.followsJob("abc123")).toBe(false);
    expect((client.sessions[0] as FakeSession).prompts).toEqual([]);
    expect(view.opened[0]?.notice).toBeUndefined();
    expect(conversations.has("abc123")).toBe(true);
    expect(view.working.get("abc123")).toBe(false);
    expect(calls.restored).toEqual([]);
  });

  test("a resting conversation saved with a job comes back with no Run in progress", async () => {
    saveEntries(entry({ state: "idle", job }));
    const conversations = make();
    await conversations.resume();
    expect(calls.restored).toEqual([]);
  });

  test("a session that does not reopen is lost: entry deleted, work ended as for a vanished agent, notice on the Board with the cause and omp's error output, no terminal", async () => {
    client.resumeWith = "fail";
    client.failDetails = "boom: no credentials";
    saveEntries(entry());
    const conversations = make();
    await conversations.resume();
    expect(calls.ended).toEqual([{ id: "abc123", abnormal: "the agent's session could not be resumed" }]);
    expect(calls.stopped).toEqual([{ name: "T3", reason: "the agent's session could not be resumed (session not found)", details: "boom: no credentials" }]);
    expect(store.saved).toEqual([]);
    expect(view.opened).toEqual([]);
    expect(conversations.has("abc123")).toBe(false);
  });

  test("a resting conversation that cannot be resumed is lost without a notice", async () => {
    client.resumeWith = "fail";
    saveEntries(entry({ state: "idle" }));
    await make().resume();
    expect(calls.stopped).toEqual([]);
    expect(store.saved).toEqual([]);
  });

  test("silence is a failed resume once the wait is over, and a late process is stopped", async () => {
    client.resumeWith = "late";
    saveEntries(entry());
    vi.useFakeTimers();
    try {
      const resuming = make().resume();
      await flush();
      vi.advanceTimersByTime(30_000);
      await resuming;
    } finally {
      vi.useRealTimers();
    }
    client.releaseLate?.();
    await flush();
    expect(calls.ended).toEqual([{ id: "abc123", abnormal: "the agent's session could not be resumed" }]);
    expect(client.lateSession?.stops).toBe(1);
  });

  test("an unreadable entry is deleted without a resume and its job ends as for a failed resume", async () => {
    saveEntries({ id: "abc123", name: "T3", job, state: "running" }, entry({ id: "def456", name: "Scan", job: { ...job, id: "job-2", name: "Scan" } }));
    await make().resume();
    expect(client.resumed.map((r) => r.sessionId)).toEqual(["session-1"]);
    expect(calls.ended).toContainEqual({ id: "abc123", abnormal: "the agent's session could not be resumed" });
    expect(store.saved.map((e) => e.id)).toEqual(["def456"]);
  });

  test("without an open project nothing can be resumed: every entry is lost", async () => {
    projectRoot = undefined;
    saveEntries(entry({ state: "idle" }));
    await make().resume();
    expect(client.resumed).toEqual([]);
    expect(store.saved).toEqual([]);
  });

  test("every open conversation of the window is resumed, each by itself", async () => {
    saveEntries(entry(), entry({ id: "def456", name: "Design", state: "idle", job: undefined }));
    const conversations = make();
    await conversations.resume();
    expect(client.resumed).toHaveLength(2);
    expect(view.opened.map((o) => o.name).sort()).toEqual(["Design", "T3"]);
  });
});
