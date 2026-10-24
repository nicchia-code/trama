import { afterEach, beforeEach, expect, test, describe } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import tramaHook from "../extension/src/omp/trama-hook";
import { PARALLEL_ENV, PARALLEL_ON, RUN_ENV, RUN_ON, TASK_ENV } from "../src/core/claims";
import { QUESTION_TOOL_REFUSAL } from "../src/core/questions";

let savedTerminal: string | undefined;
beforeEach(() => {
  savedTerminal = process.env["TRAMA_TERMINAL"];
  process.env["TRAMA_TERMINAL"] = "abc123";
});
afterEach(() => {
  if (savedTerminal === undefined) delete process.env["TRAMA_TERMINAL"];
  else process.env["TRAMA_TERMINAL"] = savedTerminal;
});

const setup = () => {
  const handlers = new Map<string, (event: unknown, ctx: { cwd: string; agent?: { kind: "main" | "sub" } }) => unknown>();
  const execs: string[][] = [];
  const pi = {
    on: (event: string, handler: (event: unknown, ctx: { cwd: string; agent?: { kind: "main" | "sub" } }) => unknown) => void handlers.set(event, handler),
    exec: async (_command: string, args: string[]) => { execs.push(args); },
  };
  const ctx = { cwd: "/project", agent: { kind: "main" as const } };
  tramaHook(pi);
  const fire = (event: string, agent: "main" | "sub" | "none" = "main") => {
    handlers.get(event)?.({}, { cwd: ctx.cwd, ...(agent === "none" ? {} : { agent: { kind: agent } }) });
  };
  return { fire, execs };
};

test("only main session completion emits idle; ends and timers emit nothing", () => {
  const { fire, execs } = setup();
  fire("agent_end");
  expect(execs).toEqual([]);
  fire("session_stop", "sub");
  expect(execs).toEqual([]);
  fire("session_stop");
  fire("session_shutdown");
  expect(execs).toEqual([["hook", "idle"], ["hook", "idle"]]);
});
test("the main session says once which process is the agent, at session_start or else agent_start; sub-agents and sessions without agent say nothing", () => {
  const sub = setup();
  sub.fire("session_start", "sub");
  sub.fire("agent_start", "sub");
  sub.fire("session_start", "none");
  expect(sub.execs).toEqual([]);
  const first = setup();
  first.fire("session_start");
  first.fire("agent_start");
  first.fire("session_start");
  expect(first.execs).toEqual([["hook", "start", String(process.pid)]]);
  const fallback = setup();
  fallback.fire("agent_start");
  fallback.fire("agent_start");
  expect(fallback.execs).toEqual([["hook", "start", String(process.pid)]]);
});
test("session shutdown reports only an explicitly main agent", () => {
  const { fire, execs } = setup();
  fire("session_shutdown", "sub");
  expect(execs).toEqual([]);
});
test("in an omp Chat conversation (TRAMA_ACP) the hook says neither that the agent started nor that it is idle, in any session", () => {
  const saved = process.env["TRAMA_ACP"];
  process.env["TRAMA_ACP"] = "1";
  try {
    const { fire, execs } = setup();
    fire("session_start");
    fire("agent_start");
    fire("session_stop");
    fire("session_shutdown");
    fire("session_shutdown", "sub");
    expect(execs).toEqual([]);
  } finally {
    if (saved === undefined) delete process.env["TRAMA_ACP"];
    else process.env["TRAMA_ACP"] = saved;
  }
});
test("in a conversation the hook still refuses omp's question tool and claims the files of a Run", () => {
  const saved = process.env["TRAMA_ACP"];
  process.env["TRAMA_ACP"] = "1";
  try {
    const handlers = new Map<string, (event: unknown, ctx: { cwd: string; agent?: { kind: "main" | "sub" } }) => unknown>();
    tramaHook({ on: (event: string, handler: (event: unknown, ctx: { cwd: string; agent?: { kind: "main" | "sub" } }) => unknown) => void handlers.set(event, handler), exec: async () => undefined });
    expect(handlers.get("tool_call")?.({ toolName: "ask" }, { cwd: "/project", agent: { kind: "main" } })).toEqual({ block: true, reason: QUESTION_TOOL_REFUSAL });
    expect(handlers.has("agent_end")).toBe(true);
    expect(handlers.has("session_stop")).toBe(false);
    expect(handlers.has("session_start")).toBe(false);
  } finally {
    if (saved === undefined) delete process.env["TRAMA_ACP"];
    else process.env["TRAMA_ACP"] = saved;
  }
});

test("the omp hook refuses the agent's own question tool with the shared refusal, and no other tool", () => {
  const handlers: Record<string, (event: unknown, ctx: { cwd: string; agent?: { kind: "main" | "sub" } }) => unknown> = {};
  tramaHook({
    on: (event: string, handler: (event: unknown, ctx: { cwd: string; agent?: { kind: "main" | "sub" } }) => unknown) => {
      handlers[event] = handler;
    },
    exec: async () => undefined,
  });
  const refuse = handlers["tool_call"];
  const ctx = { cwd: "/project", agent: { kind: "sub" as const } };
  expect(refuse?.({ toolName: "ask" }, ctx)).toEqual({ block: true, reason: QUESTION_TOOL_REFUSAL });
  expect(refuse?.({ toolName: "bash" }, ctx)).toBeUndefined();
});

describe("the write tools of a Run claim the files they write", () => {
  type Ctx = { cwd: string; agent?: { kind: "main" | "sub"; id?: string; parentId?: string } };
  const roots: string[] = [];
  let savedRun: string | undefined;
  let savedTask: string | undefined;
  let savedParallel: string | undefined;
  beforeEach(() => {
    savedRun = process.env[RUN_ENV];
    savedTask = process.env[TASK_ENV];
    savedParallel = process.env[PARALLEL_ENV];
    process.env[RUN_ENV] = RUN_ON;
    delete process.env[TASK_ENV];
    delete process.env[PARALLEL_ENV];
  });
  afterEach(() => {
    if (savedRun === undefined) delete process.env[RUN_ENV];
    else process.env[RUN_ENV] = savedRun;
    if (savedTask === undefined) delete process.env[TASK_ENV];
    else process.env[TASK_ENV] = savedTask;
    if (savedParallel === undefined) delete process.env[PARALLEL_ENV];
    else process.env[PARALLEL_ENV] = savedParallel;
    for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
  });

  const projectRoot = (): string => {
    const root = mkdtempSync(join(tmpdir(), "trama-hook-"));
    roots.push(root);
    mkdirSync(join(root, ".trama"));
    return root;
  };
  const sub = (root: string, id: string, parentId = "main"): Ctx => ({ cwd: root, agent: { kind: "sub", id, parentId } });
  const main = (root: string): Ctx => ({ cwd: root, agent: { kind: "main", id: "main" } });
  const blockedBy = (agent: string) => ({ block: true, reason: expect.stringContaining(`claimed by sub-agent ${agent} of this run`) });
  const hookOf = () => {
    const handlers = new Map<string, (event: unknown, ctx: Ctx) => unknown>();
    const execs: string[][] = [];
    tramaHook({
      on: (event: string, handler: (event: unknown, ctx: Ctx) => unknown) => void handlers.set(event, handler),
      exec: async (_command: string, args: string[]) => void execs.push(args),
    });
    return {
      write: (ctx: Ctx, path: string) => handlers.get("tool_call")?.({ toolName: "write", input: { path, content: "" } }, ctx),
      tool: (ctx: Ctx, toolName: string, input: unknown) => handlers.get("tool_call")?.({ toolName, input }, ctx),
      end: (ctx: Ctx, event: object = {}) => handlers.get("agent_end")?.(event, ctx),
      execs,
    };
  };

  test("a sub-agent claims the file it writes: another sub-agent is stopped, the holder and its descendants go on", () => {
    const root = projectRoot();
    const hook = hookOf();
    expect(hook.write(sub(root, "a"), "src/app.ts")).toBeUndefined();
    expect(hook.write(sub(root, "b"), "src/app.ts")).toEqual(blockedBy("a"));
    expect(hook.write(sub(root, "a"), "src/app.ts")).toBeUndefined();
    expect(hook.write(sub(root, "c", "a"), "src/app.ts")).toBeUndefined();
  });

  test("outside a Run the write tools claim nothing", () => {
    delete process.env[RUN_ENV];
    const root = projectRoot();
    const hook = hookOf();
    expect(hook.write(sub(root, "a"), "app.ts")).toBeUndefined();
    expect(existsSync(join(root, ".trama", "claims"))).toBe(false);
    process.env[RUN_ENV] = RUN_ON;
    expect(hook.write(sub(root, "b"), "app.ts")).toBeUndefined();
  });

  test("the main agent is stopped by a claim and takes none of its own", () => {
    const root = projectRoot();
    const hook = hookOf();
    hook.write(sub(root, "a"), "app.ts");
    expect(hook.write(main(root), "app.ts")).toEqual(blockedBy("a"));
    expect(hook.write(main(root), "other.ts")).toBeUndefined();
    expect(hook.write(sub(root, "b"), "other.ts")).toBeUndefined();
  });

  test("the advisor is neither claimed nor stopped", () => {
    const root = projectRoot();
    const hook = hookOf();
    hook.write(sub(root, "a"), "app.ts");
    expect(hook.write(sub(root, "advisor", "main"), "app.ts")).toBeUndefined();
    expect(hook.write(sub(root, "advisor", "main"), "new.ts")).toBeUndefined();
    expect(hook.write(sub(root, "b"), "new.ts")).toBeUndefined();
  });

  test("a sub-agent that ends releases its claims, unless it will continue", () => {
    const root = projectRoot();
    const hook = hookOf();
    hook.write(sub(root, "a"), "app.ts");
    hook.end(sub(root, "a"), { willContinue: true });
    expect(hook.write(sub(root, "b"), "app.ts")).toEqual(blockedBy("a"));
    hook.end(sub(root, "a"));
    expect(hook.write(sub(root, "b"), "app.ts")).toBeUndefined();
  });

  test("apply_patch claims the files its headers name, the destination of a move included", () => {
    const root = projectRoot();
    const hook = hookOf();
    const patch = "*** Begin Patch\n*** Update File: src/a.ts\n@@\n-x\n+y\n*** Add File: src/b.ts\n+z\n*** Move to: src/c.ts\n*** End Patch";
    expect(hook.tool(sub(root, "a"), "apply_patch", { input: patch })).toBeUndefined();
    expect(hook.write(sub(root, "b"), "src/b.ts")).toEqual(blockedBy("a"));
    expect(hook.write(sub(root, "b"), "src/c.ts")).toEqual(blockedBy("a"));
  });

  test("ast_edit claims the files its glob patterns match", () => {
    const root = projectRoot();
    mkdirSync(join(root, "src"));
    writeFileSync(join(root, "src", "a.ts"), "");
    writeFileSync(join(root, "src", "b.ts"), "");
    const hook = hookOf();
    expect(hook.tool(sub(root, "a"), "ast_edit", { ops: [{ pat: "x", out: "y" }], paths: ["src/**/*.ts"] })).toBeUndefined();
    expect(hook.write(sub(root, "b"), "src/b.ts")).toEqual(blockedBy("a"));
  });

  test("a path outside the project is claimed by nobody", () => {
    const root = projectRoot();
    const hook = hookOf();
    expect(hook.write(sub(root, "a"), "../elsewhere.ts")).toBeUndefined();
    expect(existsSync(join(root, ".trama", "claims"))).toBe(false);
  });

  test("a grandchild writes under the claim of its grandparent: the middle agent's tool call records the chain", () => {
    const root = projectRoot();
    const hook = hookOf();
    expect(hook.write(sub(root, "a"), "src/app.ts")).toBeUndefined();
    hook.tool(sub(root, "s", "a"), "task", {});
    expect(hook.write(sub(root, "d", "s"), "src/app.ts")).toBeUndefined();
    expect(hook.write(sub(root, "b"), "src/app.ts")).toEqual(blockedBy("a"));
  });

  test("with parallel execution on, a sub-agent stopped by another Task's claim records a conflict timing", () => {
    process.env[PARALLEL_ENV] = PARALLEL_ON;
    const root = projectRoot();
    const hook = hookOf();
    process.env[TASK_ENV] = "t1aaaa";
    expect(hook.write(sub(root, "a"), "src/app.ts")).toBeUndefined();
    process.env[TASK_ENV] = "t2bbbb";
    expect(hook.write(sub(root, "b"), "src/app.ts")).toEqual(blockedBy("a"));
    const timing = hook.execs.filter((args) => args[0] === "timing");
    expect(timing).toEqual([["timing", "new", "--input", JSON.stringify({ kind: "conflict", tasks: ["t2bbbb", "t1aaaa"], reason: "src/app.ts is claimed by another Task's sub-agent" })]]);
  });

  test("the conflict timing is recorded only with parallel execution on, two Tasks, and a sub-agent", () => {
    const root = projectRoot();
    const hook = hookOf();
    process.env[TASK_ENV] = "t1aaaa";
    hook.write(sub(root, "a"), "app.ts");
    process.env[TASK_ENV] = "t2bbbb";
    expect(hook.write(sub(root, "b"), "app.ts")).toEqual(blockedBy("a"));
    process.env[PARALLEL_ENV] = PARALLEL_ON;
    expect(hook.write(main(root), "app.ts")).toEqual(blockedBy("a"));
    process.env[TASK_ENV] = "t1aaaa";
    expect(hook.write(sub(root, "b"), "app.ts")).toEqual(blockedBy("a"));
    expect(hook.execs.filter((args) => args[0] === "timing")).toEqual([]);
  });

  test("no conflict timing without the Task of the writer, or with the same Task as the holder", () => {
    process.env[PARALLEL_ENV] = PARALLEL_ON;
    const root = projectRoot();
    const hook = hookOf();
    process.env[TASK_ENV] = "t1aaaa";
    hook.write(sub(root, "a"), "app.ts");
    expect(hook.write(sub(root, "b"), "app.ts")).toEqual(blockedBy("a"));
    delete process.env[TASK_ENV];
    expect(hook.write(sub(root, "c"), "app.ts")).toEqual(blockedBy("a"));
    expect(hook.execs.filter((args) => args[0] === "timing")).toEqual([]);
  });
});
