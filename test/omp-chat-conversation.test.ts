import { describe, expect, test } from "bun:test";
import {
  closeNeedsConfirmation,
  conversationStep,
  exitReason,
  readSavedConversations,
  RESUME_NOTICE,
  RESUME_PROMPT,
  resumeDecision,
  ResumeTimeout,
  savedEnv,
  SESSION_NOT_RESUMED_REASON,
  startFailureNotice,
  useOmpChat,
  within,
  withoutSavedConversation,
  withSavedConversation,
  type ConversationEffect,
  type SavedConversation,
} from "../src/core/omp-chat-conversation";

const effects = (list: ConversationEffect[]) => list.map((e) => e.effect);

describe("the choice between a terminal and a conversation", () => {
  test("a conversation needs omp Chat on and registered", () => {
    expect(useOmpChat({ ompChat: true, available: true })).toBe(true);
    expect(useOmpChat({ ompChat: false, available: true })).toBe(false);
    expect(useOmpChat({ ompChat: true, available: false })).toBe(false);
  });

  test("the failed start notice names the reason and the terminal", () => {
    expect(startFailureNotice("omp not found at /x/omp")).toBe("Trama: omp Chat could not start omp (omp not found at /x/omp); the job runs in a terminal.");
  });
});

describe("Agent running", () => {
  test("the hook at rest closes the conversation with autoExit on: work ends, then the process stops", () => {
    const step = conversationStep("running", { type: "agent-hook.IDLE" }, true);
    expect(step.state).toBe("closed");
    expect(effects(step.effects)).toEqual(["end-work", "stop-process", "close"]);
    expect(step.effects[0]).toEqual({ effect: "end-work" });
  });

  test("the hook at rest leaves it in Agent idle with autoExit off, and saves it as idle", () => {
    const step = conversationStep("running", { type: "agent-hook.IDLE" }, false);
    expect(step.state).toBe("idle");
    expect(step.effects).toEqual([{ effect: "end-work" }, { effect: "save-state", state: "idle" }]);
  });

  test("the hook's start only remembers the process", () => {
    expect(conversationStep("running", { type: "agent-hook.STARTED" }, true)).toEqual({ state: "running", effects: [{ effect: "remember-process" }] });
  });

  test("an unasked end of the process closes it with autoExit on or off, abnormal unless exit code 0", () => {
    for (const autoExit of [true, false]) {
      expect(conversationStep("running", { type: "omp-acp.EXITED", code: 0, signal: null }, autoExit)).toEqual({ state: "closed", effects: [{ effect: "end-work" }, { effect: "close" }] });
      expect(conversationStep("running", { type: "omp-acp.EXITED", code: 2, signal: null }, autoExit).effects[0]).toEqual({ effect: "end-work", abnormal: "its command exited with code 2" });
      expect(conversationStep("running", { type: "omp-acp.EXITED", code: null, signal: "SIGKILL" }, autoExit).effects[0]).toEqual({ effect: "end-work", abnormal: "its process was ended by SIGKILL" });
    }
  });

  test("a confirmed Stop cancels the turn and stays in Agent running", () => {
    expect(conversationStep("running", { type: "developer.STOP_CHAT_AGENT" }, true)).toEqual({ state: "running", effects: [{ effect: "cancel-turn" }] });
  });

  test("a confirmed close stops the process and ends the work as a closed terminal does", () => {
    const step = conversationStep("running", { type: "developer.CLOSE_CHAT_CONVERSATION" }, true);
    expect(step.state).toBe("closed");
    expect(step.effects).toEqual([{ effect: "stop-process" }, { effect: "end-work", abnormal: "its conversation was closed" }, { effect: "close" }]);
  });

  test("the execution check closes it, with the notice, only when the process is gone", () => {
    expect(conversationStep("running", { type: "time.CHECK_DUE", processGone: false }, true)).toEqual({ state: "running", effects: [] });
    const step = conversationStep("running", { type: "time.CHECK_DUE", processGone: true }, true);
    expect(step.state).toBe("closed");
    expect(step.effects[0]).toEqual({ effect: "report-stopped", reason: "the agent's process is gone" });
    expect(step.effects).toContainEqual({ effect: "end-work", abnormal: "the agent's process is gone" });
  });

  test("the window closing keeps the conversation and its work: nothing ends, nothing is deleted", () => {
    const step = conversationStep("running", { type: "editor.WINDOW_CLOSED" }, true);
    expect(step).toEqual({ state: "waiting", effects: [{ effect: "stop-process-for-window" }] });
  });
});

describe("Agent idle", () => {
  test("Trama no longer follows it: a later hook at rest or start changes nothing", () => {
    expect(conversationStep("idle", { type: "agent-hook.IDLE" }, true)).toEqual({ state: "idle", effects: [] });
    expect(conversationStep("idle", { type: "agent-hook.STARTED" }, true)).toEqual({ state: "idle", effects: [] });
    expect(conversationStep("idle", { type: "time.CHECK_DUE", processGone: true }, true)).toEqual({ state: "idle", effects: [] });
  });

  test("closing, or the process ending, closes it; the window waiting keeps it", () => {
    expect(conversationStep("idle", { type: "developer.CLOSE_CHAT_CONVERSATION" }, false).state).toBe("closed");
    expect(conversationStep("idle", { type: "omp-acp.EXITED", code: 1, signal: null }, false).state).toBe("closed");
    expect(conversationStep("idle", { type: "editor.WINDOW_CLOSED" }, false).state).toBe("waiting");
  });
});

describe("Waiting for the window", () => {
  test("a resumed conversation that was working goes back to Agent running with the fixed continuation", () => {
    const step = conversationStep("waiting", { type: "omp-acp.SESSION_RESUMED", wasRunning: true }, true);
    expect(step.state).toBe("running");
    expect(effects(step.effects)).toEqual(["save-state", "continue-work"]);
  });

  test("a resumed conversation at rest goes back to Agent idle", () => {
    expect(conversationStep("waiting", { type: "omp-acp.SESSION_RESUMED", wasRunning: false }, true)).toEqual({ state: "idle", effects: [{ effect: "save-state", state: "idle" }] });
  });

  test("a session that does not reopen closes it; a working one ends its work and reports it", () => {
    const working = conversationStep("waiting", { type: "omp-acp.SESSION_NOT_RESUMED", wasRunning: true }, true);
    expect(working.state).toBe("closed");
    expect(working.effects).toEqual([{ effect: "report-stopped", reason: SESSION_NOT_RESUMED_REASON }, { effect: "end-work", abnormal: SESSION_NOT_RESUMED_REASON }, { effect: "close" }]);
    expect(SESSION_NOT_RESUMED_REASON).toBe("the agent's session could not be resumed");
    const resting = conversationStep("waiting", { type: "omp-acp.SESSION_NOT_RESUMED", wasRunning: false }, true);
    expect(effects(resting.effects)).toEqual(["end-work", "close"]);
  });

  test("Closed receives nothing", () => {
    expect(conversationStep("closed", { type: "agent-hook.IDLE" }, true)).toEqual({ state: "closed", effects: [] });
  });
});

test("exit reasons", () => {
  expect(exitReason(0, null)).toBeUndefined();
  expect(exitReason(null, null)).toBe("its command ended without an exit status");
});

test("closing asks only when the agent is in a turn", () => {
  expect(closeNeedsConfirmation(true)).toBe(true);
  expect(closeNeedsConfirmation(false)).toBe(false);
});

describe("saved conversations", () => {
  const entry: SavedConversation = {
    id: "abc123",
    name: "T3",
    sessionId: "s-1",
    state: "running",
    args: ["--hook", "/x/hook.js", "acp", "--yolo"],
    env: { TRAMA_AGENT: "1", TRAMA_TERMINAL: "abc123" },
    job: { id: "job-1", kind: "run", name: "T3", announcement: "ann-1" },
    openedAt: "2026-10-23T10:00:00.000Z",
  };

  test("a saved list reads back unchanged", () => {
    expect(readSavedConversations(JSON.parse(JSON.stringify([entry])))).toEqual({ entries: [entry], unreadable: [] });
  });

  test("an unreadable entry, or one without a session, is set apart with the job it still names", () => {
    const { sessionId: _omit, ...withoutSession } = entry;
    const read = readSavedConversations([withoutSession, { id: "zzz999", name: "Scan", job: { id: "j2", kind: "scan", name: "Scan" }, state: "bad" }, 42, entry]);
    expect(read.entries).toEqual([entry]);
    expect(read.unreadable).toEqual([
      { id: "abc123", name: "T3", job: entry.job },
      { id: "zzz999", name: "Scan", job: { id: "j2", kind: "scan", name: "Scan" } },
      {},
    ]);
  });

  test("anything that is not a list holds no entry; an identity is not saved twice", () => {
    expect(readSavedConversations(undefined)).toEqual({ entries: [], unreadable: [] });
    expect(readSavedConversations({ a: 1 })).toEqual({ entries: [], unreadable: [] });
    expect(readSavedConversations([entry, entry]).entries).toHaveLength(1);
  });

  test("an entry changes in place and keeps the order of the tabs; a closed one leaves the list", () => {
    const other = { ...entry, id: "def456", name: "Design" };
    const list = withSavedConversation(withSavedConversation([], entry), other);
    expect(withSavedConversation(list, { ...entry, state: "idle" }).map((e) => [e.id, e.state])).toEqual([["abc123", "idle"], ["def456", "running"]]);
    expect(withoutSavedConversation(list, "abc123").map((e) => e.id)).toEqual(["def456"]);
  });

  test("only the variables of Trama are saved of the environment", () => {
    expect(savedEnv({ TRAMA_AGENT: "1", TRAMA_TERMINAL: "abc123", QUESTION_ENDPOINT: "sock", PATH: "/bin", TRAMA_JOB: "j", TRAMA_ADVISOR_SCANNER: "1", TRAMA_RUN: "1", PI_INTENT_TRACING: "0" })).toEqual({ TRAMA_AGENT: "1", TRAMA_TERMINAL: "abc123", TRAMA_JOB: "j", TRAMA_ADVISOR_SCANNER: "1", TRAMA_RUN: "1", PI_INTENT_TRACING: "0" });
  });

  test("the resume decision: a working conversation gets the notice and the fixed prompt, a resting one only its history", () => {
    expect(resumeDecision({ state: "running" })).toEqual({ wasRunning: true, notice: RESUME_NOTICE, prompt: RESUME_PROMPT });
    expect(resumeDecision({ state: "idle" })).toEqual({ wasRunning: false });
    expect(RESUME_NOTICE).toBe("The window reloaded; the agent continues its work.");
    expect(RESUME_PROMPT).toBe("The editor window reloaded and stopped your work. Continue it from where it stopped.");
  });
});

describe("within", () => {
  test("passes the answer and the failure through", async () => {
    expect(await within(Promise.resolve(1), 50)).toBe(1);
    await expect(within(Promise.reject(new Error("no")), 50)).rejects.toThrow("no");
  });

  test("gives up on silence with its own reason", async () => {
    await expect(within(new Promise<never>(() => undefined), 5)).rejects.toBeInstanceOf(ResumeTimeout);
    await expect(within(new Promise<never>(() => undefined), 5)).rejects.toThrow("omp did not answer within 30 s");
  });
});
