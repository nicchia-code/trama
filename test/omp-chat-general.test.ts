import { describe, expect, test } from "bun:test";
import { drawnPhase, GENERAL_INITIAL, type GeneralEffect, type GeneralEvent, type GeneralMachine, GeneralQueue, generalStep, returnedText } from "../src/core/omp-chat-general";

const run = (events: GeneralEvent[], from: GeneralMachine = GENERAL_INITIAL) => {
  let machine = from;
  const effects: GeneralEffect[] = [];
  for (const event of events) {
    const step = generalStep(machine, event);
    machine = step.next;
    effects.push(...step.effects);
  }
  return { machine, effects };
};

const on = { type: "settings", usable: true, inTurn: false, saved: false } as const;
const off = { type: "settings", usable: false, inTurn: false, saved: false } as const;
const offTurn = { type: "settings", usable: false, inTurn: true, saved: false } as const;

describe("General's start", () => {
  test("omp Chat in use with a folder: Absent to Starting, shown and started", () => {
    expect(run([on])).toEqual({ machine: { phase: "starting", session: false }, effects: ["show", "start"] });
  });

  test("not in use or no folder: nothing", () => {
    expect(run([off]).machine.phase).toBe("absent");
  });

  test("a saved session waits for the window, and the reopen resumes it", () => {
    const waiting = run([{ ...on, saved: true }]);
    expect(waiting.machine).toEqual({ phase: "waiting", session: true });
    expect(run([{ ...on, saved: true }, { type: "reopen" }]).machine).toEqual({ phase: "resuming", session: true });
  });

  test("the session opens: Starting to Ready with the queue delivered", () => {
    expect(run([on, { type: "sessionStarted" }]).machine).toEqual({ phase: "ready", session: true });
    expect(run([on, { type: "sessionStarted" }]).effects).toContain("deliver");
  });

  test("a failed start: Stopped with the reason, without a session, and no editor notice", () => {
    const failed = run([on, { type: "startFailed", missing: false }]);
    expect(failed.machine).toEqual({ phase: "stopped", session: false });
    expect(failed.effects).toEqual(["show", "start", "failed"]);
    expect(run([on, { type: "startFailed", missing: true }]).effects).toContain("missing");
  });
});
describe("messages", () => {
  test("in Ready and Kept a message goes to the agent; in Starting and Resuming it waits", () => {
    expect(run([on, { type: "sessionStarted" }, { type: "send" }]).effects.at(-1)).toBe("deliver");
    expect(run([on, { type: "send" }]).effects.at(-1)).toBe("wait");
    expect(run([{ ...on, saved: true }, { type: "reopen" }, { type: "send" }]).effects.at(-1)).toBe("wait");
  });

  test("in Stopped a message resumes a session that exited, or starts a new one without any", () => {
    const exited = run([on, { type: "sessionStarted" }, { type: "exited" }]);
    expect(exited.machine).toEqual({ phase: "stopped", session: true });
    expect(run([on, { type: "sessionStarted" }, { type: "exited" }, { type: "send" }]).machine.phase).toBe("resuming");
    expect(run([on, { type: "sessionStarted" }, { type: "exited" }, { type: "send" }]).effects.slice(-2)).toEqual(["resume", "wait"]);
    expect(run([on, { type: "startFailed", missing: false }, { type: "send" }]).machine.phase).toBe("starting");
  });

  test("Stop cancels the turn and General stays", () => {
    const step = run([on, { type: "sessionStarted" }, { type: "stop" }]);
    expect(step.machine.phase).toBe("ready");
    expect(step.effects.at(-1)).toBe("cancel");
  });

  test("a resumed session that is not reopened starts a new one", () => {
    const step = run([{ ...on, saved: true }, { type: "reopen" }, { type: "sessionNotResumed" }]);
    expect(step.machine).toEqual({ phase: "starting", session: false });
    expect(step.effects.at(-1)).toBe("startNew");
  });

  test("a resumed session opens into Ready, with the history and without any prompt", () => {
    const step = run([{ ...on, saved: true }, { type: "reopen" }, { type: "sessionResumed" }]);
    expect(step.machine).toEqual({ phase: "ready", session: true });
    expect(step.effects).not.toContain("start");
  });
});

describe("clear", () => {
  test("from every phase General starts again with a new session", () => {
    for (const from of [
      { phase: "starting", session: false },
      { phase: "ready", session: true },
      { phase: "stopped", session: true },
      { phase: "resuming", session: true },
    ] as const) {
      const step = generalStep(from, { type: "clear" });
      expect(step.next).toEqual({ phase: "starting", session: false });
      expect(step.effects).toContain("cleared");
      expect(step.effects).toContain("discard");
      expect(step.effects.at(-1)).toBe("start");
    }
  });

  test("a clear from Ready withdraws the waiting announcements", () => {
    expect(generalStep({ phase: "ready", session: true }, { type: "clear" }).effects).toContain("withdraw");
  });
});

describe("omp Chat switched off", () => {
  test("with the agent idle General is removed and its session dropped", () => {
    const step = run([on, { type: "sessionStarted" }, off]);
    expect(step.machine.phase).toBe("absent");
    expect(step.effects.slice(-4)).toEqual(["stop", "discard", "withdraw", "removed"]);
  });

  test("with the agent in a turn General is kept and its agent keeps working, and its saved entry is dropped", () => {
    expect(run([on, { type: "sessionStarted" }, offTurn]).machine.phase).toBe("kept");
    expect(generalStep({ phase: "ready", session: true }, offTurn).effects).toEqual(["unsave"]);
  });

  test("Kept: the close button closes it, and the switch back on returns it to Ready with its agent and conversation", () => {
    const kept = [on, { type: "sessionStarted" }, offTurn] as GeneralEvent[];
    expect(run([...kept, { type: "close" }]).machine.phase).toBe("absent");
    expect(run([...kept, { type: "exited" }]).machine.phase).toBe("absent");
    const back = run([...kept, { ...on }]);
    expect(back.machine).toEqual({ phase: "ready", session: true });
    expect(generalStep({ phase: "kept", session: true }, { ...on }).effects).toEqual(["save"]);
  });

  test("a Ready General that was kept follows the rules of Ready: its exit, its stop and the window closing", () => {
    const back = [on, { type: "sessionStarted" }, offTurn, { ...on }] as GeneralEvent[];
    expect(run([...back, { type: "exited" }]).machine).toEqual({ phase: "stopped", session: true });
    expect(run([...back, { type: "stop" }]).effects.at(-1)).toBe("cancel");
    expect(run([...back, { type: "windowClosed" }]).machine).toEqual({ phase: "waiting", session: true });
  });

  test("Kept accepts messages and Stop as in Ready", () => {
    const kept = [on, { type: "sessionStarted" }, offTurn] as GeneralEvent[];
    expect(run([...kept, { type: "send" }]).effects.at(-1)).toBe("deliver");
    expect(run([...kept, { type: "stop" }]).effects.at(-1)).toBe("cancel");
  });
});

describe("the window closes", () => {
  test("with a session kept it waits for the next window", () => {
    expect(run([on, { type: "sessionStarted" }, { type: "windowClosed" }]).machine).toEqual({ phase: "waiting", session: true });
  });

  test("without a session it is gone", () => {
    expect(run([on, { type: "windowClosed" }]).machine.phase).toBe("absent");
  });

  test("a kept General does not resume", () => {
    expect(run([on, { type: "sessionStarted" }, offTurn, { type: "windowClosed" }]).machine.phase).toBe("absent");
  });

  test("omp Chat not in use at the next activation drops the kept session", () => {
    expect(run([{ ...on, saved: true }, { type: "reopen" }, { type: "sessionResumed" }, off]).machine.phase).toBe("absent");
    expect(run([{ ...on, saved: true }, off]).machine.phase).toBe("absent");
  });
});

describe("drawn phase and queue", () => {
  test("absent and waiting are not drawn", () => {
    expect(drawnPhase("absent")).toBeUndefined();
    expect(drawnPhase("waiting")).toBeUndefined();
    expect(drawnPhase("ready")).toBe("ready");
  });

  test("the queue keeps the messages in order and empties on take; an empty text is nothing", () => {
    const queue = new GeneralQueue();
    queue.push("first");
    queue.push("");
    queue.push("second");
    expect(queue.size).toBe(2);
    expect(queue.take()).toEqual(["first", "second"]);
    expect(queue.size).toBe(0);
    expect(returnedText(["first", "second"])).toBe("first\nsecond");
  });
});
