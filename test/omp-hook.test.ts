import { afterEach, beforeEach, expect, test } from "bun:test";
import tramaHook from "../extension/src/omp/trama-hook";

// The heartbeat timer comes from the handler context, as omp gives it: a fake context records the timers it is given.
let savedTerminal: string | undefined;
beforeEach(() => {
  savedTerminal = process.env["TRAMA_TERMINAL"];
  process.env["TRAMA_TERMINAL"] = "abc123";
});
afterEach(() => {
  if (savedTerminal === undefined) delete process.env["TRAMA_TERMINAL"];
  else process.env["TRAMA_TERMINAL"] = savedTerminal;
});

class FakeTimer {
  cleared = false;
  constructor(
    readonly callback: () => void,
    readonly interval: number,
  ) {}
}

const setup = () => {
  const handlers = new Map<string, (event: unknown, ctx: FakeCtx) => unknown>();
  const execs: string[][] = [];
  const timers: FakeTimer[] = [];
  const pi = {
    on: (event: string, handler: (event: unknown, ctx: FakeCtx) => unknown) => void handlers.set(event, handler),
    exec: async (_command: string, args: string[]) => {
      execs.push(args);
      return undefined;
    },
  };
  const ctx: FakeCtx = {
    cwd: "/project",
    agent: { kind: "main" },
    setInterval: (callback, interval) => {
      const timer = new FakeTimer(callback, interval);
      timers.push(timer);
      return timer;
    },
    clearTimer: (handle) => {
      if (handle instanceof FakeTimer) handle.cleared = true;
    },
  };
  tramaHook(pi);
  // exec is called synchronously by the hook, so `execs` is up to date right after each event.
  const fire = (event: string) => void handlers.get(event)?.({}, ctx);
  return { fire, execs, timers };
};

interface FakeCtx {
  cwd: string;
  agent?: { kind: "main" | "sub" };
  setInterval(callback: () => void, interval: number): unknown;
  clearTimer(handle: unknown): void;
}

test("the heartbeat sends alive at once and repeats every five minutes until the agent ends", () => {
  const { fire, execs, timers } = setup();
  fire("agent_start");
  expect(execs).toEqual([["agent-event", "alive"]]);
  expect(timers).toHaveLength(1);
  expect(timers[0]?.interval).toBe(300000);

  timers[0]?.callback();
  timers[0]?.callback();
  expect(execs).toEqual([["agent-event", "alive"], ["agent-event", "alive"], ["agent-event", "alive"]]);

  fire("agent_end");
  expect(timers[0]?.cleared).toBe(true);
});

test("a new agent_start replaces the running heartbeat and session shutdown stops it", () => {
  const { fire, timers } = setup();
  fire("agent_start");
  fire("agent_start");
  expect(timers).toHaveLength(2);
  expect(timers[0]?.cleared).toBe(true);
  expect(timers[1]?.cleared).toBe(false);

  fire("session_shutdown");
  expect(timers[1]?.cleared).toBe(true);
});
