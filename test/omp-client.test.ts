import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { ReadableStream as NodeReadableStream, TransformStream as NodeTransformStream, WritableStream as NodeWritableStream } from "node:stream/web";
import { join } from "node:path";
import type { SessionNotification } from "@agentclientprotocol/sdk";
import { OmpClient, type OmpClientDeps } from "../extension/src/host/omp-chat/client";
import type { TurnEnd } from "../src/core/omp-chat-conversation";
import { QUESTION_TOOL_REFUSAL } from "../src/core/questions";
import { type OmpExit, type OmpLaunch, OmpStartFailure, type OmpSessionPort, type PermissionRequest } from "../extension/src/host/omp-chat/ports";

// The client talks to a stand-in for omp (`fixtures/fake-omp.ts`) started through a small `sh` wrapper, so the real process handling is what runs.
const posix = process.platform !== "win32";
let folder: string;
let wrapper: string;
let project: string;

beforeAll(() => {
  // The test run registers happy-dom (`test/happydom.ts`), whose web streams are not Node's; the extension host runs in Node, where the SDK's streams are Node's.
  Object.assign(globalThis, { ReadableStream: NodeReadableStream, WritableStream: NodeWritableStream, TransformStream: NodeTransformStream });
  folder = realpathSync(mkdtempSync(join(tmpdir(), "omp-client-")));
  project = join(folder, "project");
  mkdirSync(join(project, ".omp"), { recursive: true });
  writeFileSync(join(project, ".omp", "mcp.json"), JSON.stringify({ mcpServers: { one: { command: "x" }, two: { url: "https://x/mcp" } } }));
  wrapper = join(folder, "omp");
  writeFileSync(wrapper, `#!/bin/sh\nexec "${process.execPath}" "${join(import.meta.dir, "fixtures", "fake-omp.ts")}" "$@"\n`);
  chmodSync(wrapper, 0o755);
});
afterAll(() => rmSync(folder, { recursive: true, force: true }));

const launch = (mode = "", extra: Record<string, string> = {}, args = ["--model", "m/one", "acp", "--yolo"]): OmpLaunch => ({ args, env: { FAKE_OMP: mode, TRAMA_TERMINAL: "term-1", ...extra }, cwd: project });
const client = (deps: Partial<OmpClientDeps> = {}) => new OmpClient({ ompPath: () => wrapper, mcpServers: (root) => (deps.mcpServers ? deps.mcpServers(root) : []), ...deps });

const texts = (session: OmpSessionPort) => {
  const seen: string[] = [];
  session.onUpdate((n: SessionNotification) => {
    const update = n.update as { content?: { text?: string } };
    if (update.content?.text !== undefined) seen.push(update.content.text);
  });
  return seen;
};
const alive = (pid: number): boolean => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};
const until = async (condition: () => boolean, ms = 3000) => {
  const end = Date.now() + ms;
  while (!condition()) {
    if (Date.now() > end) throw new Error("timed out");
    await Bun.sleep(10);
  }
};

describe.skipIf(!posix)("starting omp", () => {
  test("spawns it with the job's arguments, the launch's environment and the project as folder, and replays what arrived before anyone listened", async () => {
    const session = await client().start(launch());
    try {
      expect(session.sessionId).toBe("s-1");
      expect(session.pid).toBeGreaterThan(0);
      await Bun.sleep(100);
      const seen = texts(session);
      expect(seen).toEqual([`started:--model m/one acp --yolo|term-1|mcp=0|cwd=${project}`]);
    } finally {
      await session.stop();
    }
  });

  test("the first message is delivered without waiting for its turn and reaches omp as text, with a resource_link for an attachment", async () => {
    const session = await client().start(launch(), { text: "hello", attachment: "/tmp/drifts.md" });
    try {
      const seen = texts(session);
      await until(() => seen.some((line) => line.startsWith("echo:")));
      expect(seen.find((line) => line.startsWith("echo:"))).toBe("echo:<file:///tmp/drifts.md> hello");
    } finally {
      await session.stop();
    }
  });

  test("the MCP servers of the project go in session/new", async () => {
    const { readMcpServers } = await import("../src/core/omp-mcp");
    const session = await client({ mcpServers: (root) => readMcpServers(root, {}, join(folder, "nohome")) }).start(launch());
    try {
      await Bun.sleep(100);
      expect(texts(session).find((line) => line.startsWith("started:"))).toContain("mcp=2");
    } finally {
      await session.stop();
    }
  });
});

describe.skipIf(!posix)("a start that fails", () => {
  const failure = async (promise: Promise<unknown>) => {
    const error = await promise.then(
      () => undefined,
      (caught: unknown) => caught,
    );
    expect(error).toBeInstanceOf(OmpStartFailure);
    return (error as OmpStartFailure).message;
  };

  test("omp not found", async () => {
    const reason = await failure(new OmpClient({ ompPath: () => join(folder, "missing", "omp") }).start(launch()));
    expect(reason).toBe(`omp not found at ${join(folder, "missing", "omp")}`);
  });
  test("omp exits", async () => {
    expect(await failure(client().start(launch("exit3")))).toBe("omp exited with code 3");
  });
  test("omp does not answer initialize", async () => {
    expect(await failure(client({ openTimeoutMs: 150 }).start(launch("silent")))).toBe("omp did not answer within 30 s");
  });
  test("one limit covers the whole opening: an omp that answers initialize and then goes silent fails it, and its process is stopped", async () => {
    const log = join(folder, "slow-new.log");
    const pids: number[] = [];
    const began = Date.now();
    expect(await failure(client({ openTimeoutMs: 400 }).start(launch("slow-new", { FAKE_OMP_LOG: log }), undefined, (pid) => pids.push(pid)))).toBe("omp did not answer within 30 s");
    expect(Date.now() - began).toBeLessThan(2500);
    await until(() => pids[0] !== undefined && !alive(pids[0]));
    expect(readFileSync(log, "utf8")).toContain("SIGTERM");
  });
  test("a resume of a session omp cannot reopen fails the same way", async () => {
    expect(await failure(client().resume(launch("exit3"), "s-1"))).toBe("omp exited with code 3");
  });
  test("the failure carries the last lines omp wrote on its error output", async () => {
    const error = await client().start(launch("exit3")).then(() => undefined, (caught: unknown) => caught);
    expect((error as OmpStartFailure).details).toBe("boom: no credentials");
    const resumed = await client().resume(launch("exit3"), "s-1").then(() => undefined, (caught: unknown) => caught);
    expect((resumed as OmpStartFailure).details).toBe("boom: no credentials");
  });
  test("an omp that does not declare what 18.12.6 declares is a failed start with the reason, and there is no fallback", async () => {
    expect(await failure(client().start(launch("no-steering")))).toBe("omp does not declare steering (_session/steering)");
    expect(await failure(client().start(launch("no-close")))).toBe("omp does not declare session/close");
    expect(await failure(client().start(launch("no-model")))).toBe("omp declares no model option for the session");
    expect(await failure(client().resume(launch("no-load"), "s-1"))).toBe("omp does not declare session/load");
  });
  test("the pid is told the moment the process is spawned, also when the start then fails", async () => {
    const pids: number[] = [];
    await failure(client().start(launch("exit3"), undefined, (pid) => pids.push(pid)));
    expect(pids).toHaveLength(1);
    expect(pids[0]).toBeGreaterThan(0);
  });
});

describe.skipIf(!posix)("the turns", () => {
  test("a prompt's turn is signalled and the prompt resolves when it ends", async () => {
    const session = await client().start(launch());
    try {
      const turns: boolean[] = [];
      session.onTurn((inTurn) => turns.push(inTurn));
      await session.sendPrompt({ text: "one" });
      expect(turns).toEqual([true, false]);
      expect(session.inTurn).toBe(false);
    } finally {
      await session.stop();
    }
  });

  test("a message in the middle of a turn is steering when omp declares it", async () => {
    const session = await client().start(launch());
    try {
      const seen = texts(session);
      const statuses: string[] = [];
      const turn = session.sendPrompt({ text: "slow" });
      await until(() => session.inTurn && seen.includes("echo:slow"));
      const steered = session.send({ text: "more" }, "steer", (status) => statuses.push(status.status));
      await until(() => seen.includes("steered:more"));
      expect(statuses).toEqual(["delivered"]);
      expect(session.inTurn).toBe(true);
      session.cancel();
      await Promise.all([turn, steered]);
      expect(seen.filter((line) => line.startsWith("echo:"))).toEqual(["echo:slow"]);
    } finally {
      await session.stop();
    }
  });

  test("a queued message in the middle of a turn is shown and answered at the end of that turn", async () => {
    const session = await client().start(launch());
    try {
      const seen = texts(session);
      const statuses: string[] = [];
      const turn = session.sendPrompt({ text: "slow" });
      await until(() => session.inTurn && seen.includes("echo:slow"));
      const queued = session.send({ text: "next" }, "queue", (status) => statuses.push(status.status));
      await until(() => seen.includes("echo:next"));
      expect(statuses).toEqual(["queued", "delivered"]);
      await Promise.all([turn, queued]);
      expect(seen.filter((line) => line.startsWith("echo:"))).toEqual(["echo:slow", "echo:next"]);
    } finally {
      await session.stop();
    }
  });

  test("a message sent while a permission request waits is held until the answer, then goes on as a follow-up", async () => {
    const session = await client().start(launch("", {}, ["--model", "m/one", "acp"]));
    try {
      const seen = texts(session);
      const requests: PermissionRequest[] = [];
      session.onPermissionRequest((request) => requests.push(request));
      const turn = session.sendPrompt({ text: "perm" });
      await until(() => requests.length === 1);
      const statuses: string[] = [];
      const held = session.send({ text: "after" }, "steer", (status) => statuses.push(status.status));
      // A short wait on a real process: nothing has to reach omp meanwhile, and there is no event to await for that.
      await Bun.sleep(100);
      expect(statuses).toEqual(["queued"]);
      expect(seen).not.toContain("echo:after");
      session.answerPermission(requests[0]!.requestId, "once");
      await until(() => statuses.at(-1) === "delivered");
      await Promise.all([turn, held]);
      expect(seen.filter((line) => line === "echo:after")).toHaveLength(1);
    } finally {
      await session.stop();
    }
  });

  test("a message held for a permission request is not delivered when Stop cancels the request", async () => {
    const session = await client().start(launch("", {}, ["--model", "m/one", "acp"]));
    try {
      const seen = texts(session);
      const requests: PermissionRequest[] = [];
      session.onPermissionRequest((request) => requests.push(request));
      const turn = session.sendPrompt({ text: "perm" });
      await until(() => requests.length === 1);
      const statuses: { status: string; reason?: string }[] = [];
      const held = session.send({ text: "lost" }, "queue", (status) => statuses.push(status));
      session.cancel();
      await Promise.all([turn, held]);
      expect(statuses.map((status) => status.status)).toEqual(["queued", "failed"]);
      expect(statuses.at(-1)?.reason).toBe("the agent stopped before the message reached it");
      expect(seen).not.toContain("echo:lost");
    } finally {
      await session.stop();
    }
  });

  test("Stop is session/cancel", async () => {
    const session = await client().start(launch());
    try {
      const started = Date.now();
      const turn = session.sendPrompt({ text: "slow" });
      await until(() => session.inTurn);
      await Bun.sleep(100);
      session.cancel();
      await turn;
      expect(Date.now() - started).toBeLessThan(1200);
      expect(session.inTurn).toBe(false);
    } finally {
      await session.stop();
    }
  });
});

describe.skipIf(!posix)("what omp asks", () => {
  test("a form is passed to the listener, replayed to a late one, and its answer goes back", async () => {
    const session = await client().start(launch());
    try {
      const seen = texts(session);
      const turn = session.sendPrompt({ text: "form" });
      await Bun.sleep(150);
      const requests: { requestId: string; message: string }[] = [];
      session.onFormRequest((request) => requests.push(request));
      expect(requests.map((request) => request.message)).toEqual(["Pick"]);
      session.answerForm("unknown", { action: "decline" });
      session.answerForm(requests[0]!.requestId, { action: "accept", content: { a: "x" } });
      await turn;
      expect(seen).toContain("form:accept");
    } finally {
      await session.stop();
    }
  });

  test("a form waiting when the conversation closes is declined", async () => {
    const session = await client().start(launch());
    const seen = texts(session);
    void session.sendPrompt({ text: "form" }).catch(() => {});
    await Bun.sleep(150);
    await session.stop();
    expect(seen).not.toContain("form:accept");
  });

  test("with yolo a permission request is answered with allow_always, never a refusal", async () => {
    const session = await client().start(launch());
    try {
      const seen = texts(session);
      await session.sendPrompt({ text: "perm" });
      expect(seen).toContain("perm:always");
    } finally {
      await session.stop();
    }
  });

  const asked = (session: OmpSessionPort) => {
    const requests: PermissionRequest[] = [];
    session.onPermissionRequest((request) => requests.push(request));
    return requests;
  };

  test("without yolo a permission request waits, replayed to a late listener, and the chosen option goes back; an option not offered is ignored", async () => {
    const session = await client().start(launch("", {}, ["--model", "m/one", "acp"]));
    try {
      const seen = texts(session);
      const requests = asked(session);
      const turn = session.sendPrompt({ text: "perm" });
      await until(() => requests.length === 1);
      const late = asked(session);
      expect(late.map((request) => request.requestId)).toEqual([requests[0]!.requestId]);
      expect(requests[0]?.options.map((option) => option.optionId)).toEqual(["no", "once", "always"]);
      session.answerPermission(requests[0]!.requestId, "nope");
      session.answerPermission("unknown", "once");
      session.answerPermission(requests[0]!.requestId, "no");
      await turn;
      expect(seen.filter((text) => text.startsWith("perm:"))).toEqual(["perm:no"]);
    } finally {
      await session.stop();
    }
  });

  test("a waiting permission request is answered cancelled on Stop", async () => {
    const session = await client().start(launch("", {}, ["acp"]));
    try {
      const seen = texts(session);
      const cancelled: string[] = [];
      session.onPermissionCancelled((id) => cancelled.push(id));
      const requests = asked(session);
      const turn = session.sendPrompt({ text: "perm" });
      await until(() => requests.length === 1);
      session.cancel();
      await turn;
      expect(cancelled).toEqual([requests[0]!.requestId]);
      expect(seen).toContain("perm:undefined");
    } finally {
      await session.stop();
    }
  });

  test("a waiting permission request is answered cancelled when the conversation closes", async () => {
    const session = await client().start(launch("", {}, ["acp"]));
    const cancelled: string[] = [];
    session.onPermissionCancelled((id) => cancelled.push(id));
    const requests = asked(session);
    void session.sendPrompt({ text: "perm" }).catch(() => {});
    await until(() => requests.length === 1);
    await session.stop();
    expect(cancelled).toEqual([requests[0]!.requestId]);
  });
});

describe.skipIf(!posix)("the models", () => {
  test("they come from the session's options and a change goes through them", async () => {
    const session = await client().start(launch());
    try {
      expect(await session.models()).toEqual({ available: [{ id: "m/one", name: "One" }, { id: "m/two", name: "Two" }], current: "m/one" });
      await session.setModel("m/two");
      expect((await session.models()).current).toBe("m/two");
    } finally {
      await session.stop();
    }
  });
});

describe.skipIf(!posix)("reopening a saved session", () => {
  test("session/load replays the history to the listener", async () => {
    const session = await client().resume(launch(), "saved-1");
    try {
      expect(session.sessionId).toBe("saved-1");
      expect(texts(session)).toContain("history");
    } finally {
      await session.stop();
    }
  });
});

describe.skipIf(!posix)("the end of the process", () => {
  test("an exit Trama did not ask for is reported, also to a listener that comes late", async () => {
    const session = await client().start(launch());
    const exits: OmpExit[] = [];
    session.onExit((exit) => exits.push(exit));
    process.kill(session.pid!, "SIGKILL");
    await until(() => exits.length === 1);
    expect(exits[0]).toEqual({ code: null, signal: "SIGKILL" });
    const late: OmpExit[] = [];
    session.onExit((exit) => late.push(exit));
    await until(() => late.length === 1);
  });

  test("a stop sends SIGTERM and gives no exit", async () => {
    const session = await client().start(launch());
    const exits: OmpExit[] = [];
    session.onExit((exit) => exits.push(exit));
    await session.stop();
    await Bun.sleep(50);
    expect(exits).toEqual([]);
    expect(() => process.kill(session.pid!, 0)).toThrow();
  });

  test("a process that ignores SIGTERM is killed after the grace", async () => {
    const session = await client({ stopGraceMs: 150 }).start(launch("stubborn"));
    const began = Date.now();
    await session.stop();
    expect(Date.now() - began).toBeGreaterThanOrEqual(140);
    expect(() => process.kill(session.pid!, 0)).toThrow();
  });
});

describe.skipIf(!posix)("the end of the work", () => {
  const ends = (session: OmpSessionPort) => {
    const seen: TurnEnd[] = [];
    session.onTurnEnd((end) => seen.push(end));
    return seen;
  };

  test("the answer to the first message is the end of the work, with its stop reason", async () => {
    const session = await client().start(launch(), { text: "hello" });
    try {
      const seen = ends(session);
      await until(() => seen.length === 1);
      expect(seen).toEqual([{ stopReason: "end_turn" }]);
    } finally {
      await session.stop();
    }
  });

  test("an abnormal stop reason is carried as it is", async () => {
    const session = await client().start(launch(), { text: "refusal" });
    try {
      const seen = ends(session);
      await until(() => seen.length === 1);
      expect(seen).toEqual([{ stopReason: "refusal" }]);
    } finally {
      await session.stop();
    }
    const limited = await client().start(launch(), { text: "tokens" });
    try {
      const seen = ends(limited);
      await until(() => seen.length === 1);
      expect(seen).toEqual([{ stopReason: "max_tokens" }]);
    } finally {
      await limited.stop();
    }
  });

  test("a prompt omp refuses is the end of the work with omp's message, and nothing is swallowed or left unhandled", async () => {
    const session = await client().start(launch(), { text: "refuse" });
    try {
      const seen = ends(session);
      await until(() => seen.length === 1);
      expect(seen).toEqual([{ error: "no credentials" }]);
      expect(session.inTurn).toBe(false);
    } finally {
      await session.stop();
    }
  });

  test("Stop is a normal end of the work: the answer is cancelled", async () => {
    const session = await client().start(launch(), { text: "slow" });
    try {
      const seen = ends(session);
      await until(() => session.inTurn);
      await Bun.sleep(100);
      session.cancel();
      await until(() => seen.length === 1);
      expect(seen).toEqual([{ stopReason: "cancelled" }]);
    } finally {
      await session.stop();
    }
  });

  test("an end that comes before anyone listens is the one the first listener receives, once", async () => {
    const session = await client().start(launch(), { text: "hello" });
    try {
      await Bun.sleep(150);
      const seen = ends(session);
      await until(() => seen.length === 1);
      const again = ends(session);
      await Bun.sleep(50);
      expect(again).toEqual([]);
      expect(seen).toEqual([{ stopReason: "end_turn" }]);
    } finally {
      await session.stop();
    }
  });

  test("a message of the developer queued behind the work defers the end to the turn that delivers it", async () => {
    const session = await client().start(launch(), { text: "slow" });
    try {
      const seen = ends(session);
      const seenText = texts(session);
      await until(() => session.inTurn && seenText.includes("echo:slow"));
      const sent = session.send({ text: "later" }, "queue", () => {});
      await until(() => seenText.includes("echo:later"), 4000);
      await sent;
      await until(() => seen.length === 1);
      expect(seen).toEqual([{ stopReason: "end_turn" }]);
      // The work's own turn ended first, with the message still waiting: only the turn that delivered it ended the work.
      expect(seenText.filter((line) => line.startsWith("echo:"))).toEqual(["echo:slow", "echo:later"]);
    } finally {
      await session.stop();
    }
  });

  test("a message of the developer in a turn that is not the work's changes nothing, and General or Ask more (no first message) produce no end", async () => {
    const session = await client().start(launch());
    try {
      const seen = ends(session);
      await session.sendPrompt({ text: "hello" });
      await Bun.sleep(100);
      expect(seen).toEqual([]);
    } finally {
      await session.stop();
    }
  });

  test("the prompt that continues the work after a resume ends it the same way", async () => {
    const session = await client().resume(launch(), "saved-1");
    try {
      const seen = ends(session);
      await session.sendPrompt({ text: "continue", work: true });
      expect(seen).toEqual([{ stopReason: "end_turn" }]);
    } finally {
      await session.stop();
    }
  });

  test("the prompt of the work never rejects, even when omp refuses it", async () => {
    const session = await client().resume(launch(), "saved-1");
    try {
      const seen = ends(session);
      await expect(session.sendPrompt({ text: "refuse", work: true })).resolves.toBeUndefined();
      expect(seen).toEqual([{ error: "no credentials" }]);
    } finally {
      await session.stop();
    }
  });

  test("a prompt that is not the work's rejects with omp's error", async () => {
    const session = await client().start(launch());
    try {
      await expect(session.sendPrompt({ text: "refuse" })).rejects.toThrow("no credentials");
    } finally {
      await session.stop();
    }
  });
});

describe.skipIf(!posix)("the end of the process, explained", () => {
  test("an exit omp's own crash causes carries the last lines of its error output", async () => {
    const session = await client().start(launch());
    const exits: OmpExit[] = [];
    session.onExit((exit) => exits.push(exit));
    void session.sendPrompt({ text: "die" }).catch(() => {});
    await until(() => exits.length === 1);
    expect(exits[0]).toEqual({ code: 2, signal: null, details: "fatal: out of memory" });
  });

  test("a connection that closes while the process stays is reported once, without an exit status", async () => {
    const session = await client().start(launch());
    const exits: OmpExit[] = [];
    session.onExit((exit) => exits.push(exit));
    void session.sendPrompt({ text: "closeconn" }).catch(() => {});
    await until(() => exits.length === 1, 4000);
    await Bun.sleep(1200);
    expect(exits).toEqual([{ code: null, signal: null }]);
    await session.stop();
  });

  test("a process that exits when Trama did not ask is reported exactly once", async () => {
    const session = await client().start(launch());
    const exits: OmpExit[] = [];
    session.onExit((exit) => exits.push(exit));
    process.kill(session.pid!, "SIGKILL");
    await until(() => exits.length === 1);
    await Bun.sleep(1300);
    expect(exits).toHaveLength(1);
  });
});

describe.skipIf(!posix)("stopping the process", () => {
  const logged = (file: string) => readFileSync(file, "utf8").split("\n").filter((line) => line !== "");

  test("session/close comes before SIGTERM, and a turn in progress is cancelled first", async () => {
    const log = join(folder, "order.log");
    const session = await client().start(launch("", { FAKE_OMP_LOG: log }));
    const turn = session.sendPrompt({ text: "slow" }).catch(() => {});
    await until(() => session.inTurn);
    await Bun.sleep(100);
    await session.stop();
    await turn;
    expect(logged(log)).toEqual(["session/cancel", "session/close", "SIGTERM"]);
    expect(() => process.kill(session.pid!, 0)).toThrow();
  });

  test("with no turn running nothing is cancelled", async () => {
    const log = join(folder, "idle.log");
    const session = await client().start(launch("", { FAKE_OMP_LOG: log }));
    await session.stop();
    expect(logged(log)).toEqual(["session/close", "SIGTERM"]);
  });

  test("deactivating skips session/close", async () => {
    const log = join(folder, "deactivating.log");
    const session = await client().start(launch("", { FAKE_OMP_LOG: log }));
    await session.stop({ deactivating: true });
    expect(logged(log)).toEqual(["SIGTERM"]);
  });

  test("a stop does not wait more than the limit for session/close when omp does not answer it", async () => {
    const log = join(folder, "slow-close.log");
    const session = await client({ closeTimeoutMs: 200 }).start(launch("no-close-answer", { FAKE_OMP_LOG: log }));
    const began = Date.now();
    await session.stop();
    expect(Date.now() - began).toBeLessThan(2000);
    expect(Date.now() - began).toBeGreaterThanOrEqual(190);
    expect(() => process.kill(session.pid!, 0)).toThrow();
  });

  test("the commands omp started go with it: SIGTERM goes to the whole group", async () => {
    const child = join(folder, "child.pid");
    const session = await client().start(launch("children", { FAKE_OMP_CHILD: child }));
    await until(() => readFileSync(child, "utf8") !== "");
    const command = Number(readFileSync(child, "utf8"));
    expect(alive(command)).toBe(true);
    await session.stop();
    await until(() => !alive(command));
  });

  test("a command that ignores SIGTERM is killed with the group at the end of the grace, though omp itself is gone", async () => {
    const child = join(folder, "orphan.pid");
    const session = await client({ stopGraceMs: 300 }).start(launch("orphan", { FAKE_OMP_CHILD: child }));
    await until(() => readFileSync(child, "utf8") !== "");
    const command = Number(readFileSync(child, "utf8"));
    await session.stop();
    expect(alive(command)).toBe(true);
    await until(() => !alive(command), 3000);
  });
});

describe.skipIf(!posix)("the forms of omp in a job conversation", () => {
  test("a form is declined at once with the question tool's refusal, and the view receives none", async () => {
    const session = await client().start({ ...launch(), hook: true });
    try {
      const seen = texts(session);
      const requests: unknown[] = [];
      session.onFormRequest((request) => requests.push(request));
      await session.sendPrompt({ text: "form" });
      expect(requests).toEqual([]);
      expect(seen).toContain("form:decline");
      expect(seen).toContain(`form-message:${QUESTION_TOOL_REFUSAL}`);
    } finally {
      await session.stop();
    }
  });

  test("the same holds after a resume of a job conversation", async () => {
    const session = await client().resume({ ...launch(), hook: true }, "saved-1");
    try {
      const seen = texts(session);
      const requests: unknown[] = [];
      session.onFormRequest((request) => requests.push(request));
      await session.sendPrompt({ text: "form" });
      expect(requests).toEqual([]);
      expect(seen).toContain("form:decline");
    } finally {
      await session.stop();
    }
  });

  test("without the hook (Ask more, General) the form still goes to the listener", async () => {
    const session = await client().start({ ...launch(), hook: false });
    try {
      const requests: { requestId: string }[] = [];
      session.onFormRequest((request) => requests.push(request));
      const turn = session.sendPrompt({ text: "form" });
      await until(() => requests.length === 1);
      session.answerForm(requests[0]!.requestId, { action: "decline" });
      await turn;
    } finally {
      await session.stop();
    }
  });
});
