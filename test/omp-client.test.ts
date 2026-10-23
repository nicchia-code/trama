import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { chmodSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { ReadableStream as NodeReadableStream, TransformStream as NodeTransformStream, WritableStream as NodeWritableStream } from "node:stream/web";
import { join } from "node:path";
import type { SessionNotification } from "@agentclientprotocol/sdk";
import { OmpClient, type OmpClientDeps } from "../extension/src/host/omp-chat/client";
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
    expect(await failure(client({ initializeTimeoutMs: 150 }).start(launch("silent")))).toBe("omp did not answer within 30 s");
  });
  test("a resume of a session omp cannot reopen fails the same way", async () => {
    expect(await failure(client().resume(launch("exit3"), "s-1"))).toBe("omp exited with code 3");
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
      const turn = session.sendPrompt({ text: "slow" });
      await until(() => session.inTurn && seen.includes("echo:slow"));
      const steered = session.sendPrompt({ text: "more" });
      await until(() => seen.includes("steered:more"));
      expect(session.inTurn).toBe(true);
      session.cancel();
      await Promise.all([turn, steered]);
      expect(seen.filter((line) => line.startsWith("echo:"))).toEqual(["echo:slow"]);
    } finally {
      await session.stop();
    }
  });

  test("without steering it waits for the end of the turn and goes as the next prompt", async () => {
    const session = await client().start(launch("plain"));
    try {
      const seen = texts(session);
      const turns: boolean[] = [];
      session.onTurn((inTurn) => turns.push(inTurn));
      const first = session.sendPrompt({ text: "slow" });
      await until(() => seen.includes("echo:slow"));
      const second = session.sendPrompt({ text: "next" });
      await Bun.sleep(100);
      expect(seen).not.toContain("echo:next");
      session.cancel();
      await Promise.all([first, second]);
      expect(seen.filter((line) => line.startsWith("echo:"))).toEqual(["echo:slow", "echo:next"]);
      expect(turns).toEqual([true, false]);
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

  test("a session without options takes omp's list, and its change is refused with omp's message", async () => {
    const session = await client({ models: async () => ({ models: [{ value: "x/y", label: "XY" }, { value: "x/z" }] }) }).start(launch("plain"));
    try {
      expect(await session.models()).toEqual({ available: [{ id: "x/y", name: "XY" }, { id: "x/z", name: "x/z" }] });
      await expect(session.setModel("x/y")).rejects.toThrow("no session/set_model");
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
  test("session/resume when omp declares it and not load", async () => {
    const session = await client().resume(launch("resume-only"), "saved-2");
    try {
      expect(session.sessionId).toBe("saved-2");
      expect(texts(session)).not.toContain("history");
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
