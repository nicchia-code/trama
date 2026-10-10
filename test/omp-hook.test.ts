import { afterEach, beforeEach, expect, test } from "bun:test";
import tramaHook from "../extension/src/omp/trama-hook";

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
  const fire = (event: string, agent: "main" | "sub" | undefined = "main") => {
    handlers.get(event)?.({}, { cwd: ctx.cwd, ...(agent === undefined ? {} : { agent: { kind: agent } }) });
  };
  return { fire, execs };
};

test("only main session completion emits idle; starts, ends and timers emit nothing", () => {
  const { fire, execs } = setup();
  fire("agent_start");
  fire("agent_end");
  expect(execs).toEqual([]);
  fire("session_stop", "sub");
  expect(execs).toEqual([]);
  fire("session_stop");
  fire("session_shutdown");
  expect(execs).toEqual([["agent-event", "idle"], ["agent-event", "idle"]]);
});
test("session shutdown reports only an explicitly main agent", () => {
  const { fire, execs } = setup();
  fire("session_shutdown", "sub");
  expect(execs).toEqual([]);
});
