import { describe, expect, test } from "bun:test";
import {
  agentStoppedNotice,
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
  turnEndReason,
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

  test("the failed start notice names the reason and the terminal, then the last lines of omp's error output", () => {
    expect(startFailureNotice("omp not found at /x/omp")).toBe("Trama: omp Chat could not start omp (omp not found at /x/omp); the job runs in a terminal.");
    expect(startFailureNotice("omp exited with code 3", "boom")).toBe("Trama: omp Chat could not start omp (omp exited with code 3); the job runs in a terminal.\nboom");
  });
});

describe("Agent running", () => {
  test("the end of the turn closes the conversation with autoExit on: work ends, then the process stops", () => {
    const step = conversationStep("running", { type: "omp-acp.TURN_ENDED", end: { stopReason: "end_turn" } }, true);
    expect(step.state).toBe("closed");
    expect(step.effects).toEqual([{ effect: "end-work" }, { effect: "stop-process" }, { effect: "close" }]);
  });

  test("the end of the turn leaves it in Agent idle with autoExit off, and saves it as idle", () => {
    const step = conversationStep("running", { type: "omp-acp.TURN_ENDED", end: { stopReason: "end_turn" } }, false);
    expect(step.state).toBe("idle");
    expect(step.effects).toEqual([{ effect: "end-work" }, { effect: "save-state", state: "idle" }]);
  });

  test("Stop (cancelled) is a normal end of the turn, with no notice", () => {
    expect(conversationStep("running", { type: "omp-acp.TURN_ENDED", end: { stopReason: "cancelled" } }, true).effects).toEqual([{ effect: "end-work" }, { effect: "stop-process" }, { effect: "close" }]);
  });

  test("an abnormal end of the turn ends the work with the reason and reports it on the Board, with autoExit on or off", () => {
    const refused = conversationStep("running", { type: "omp-acp.TURN_ENDED", end: { stopReason: "refusal" } }, true);
    expect(refused.state).toBe("closed");
    expect(refused.effects).toEqual([
      { effect: "end-work", abnormal: "the model refused to continue" },
      { effect: "report-agent-stopped", reason: "the model refused to continue" },
      { effect: "stop-process" },
      { effect: "close" },
    ]);
    const limit = conversationStep("running", { type: "omp-acp.TURN_ENDED", end: { stopReason: "max_tokens" } }, false);
    expect(limit.state).toBe("idle");
    expect(limit.effects).toEqual([
      { effect: "end-work", abnormal: "the model reached its token limit" },
      { effect: "report-agent-stopped", reason: "the model reached its token limit" },
      { effect: "save-state", state: "idle" },
    ]);
  });

  test("the reasons of an end of turn", () => {
    expect(turnEndReason({ stopReason: "end_turn" })).toBeUndefined();
    expect(turnEndReason({ stopReason: "cancelled" })).toBeUndefined();
    expect(turnEndReason({ stopReason: "refusal" })).toBe("the model refused to continue");
    expect(turnEndReason({ stopReason: "max_tokens" })).toBe("the model reached its token limit");
    expect(turnEndReason({ stopReason: "max_turn_requests" })).toBe("the model reached its request limit");
    expect(turnEndReason({ error: "no credentials" })).toBe("omp refused the prompt (no credentials)");
    expect(agentStoppedNotice("T3", "the model reached its token limit")).toBe("The agent of T3 stopped: the model reached its token limit.");
  });

  test("an unasked end of the process closes it with autoExit on or off, and the notice gives the reason with the last lines of omp's error output", () => {
    for (const autoExit of [true, false]) {
      expect(conversationStep("running", { type: "omp-acp.EXITED", code: 0, signal: null }, autoExit)).toEqual({
        state: "closed",
        effects: [{ effect: "end-work" }, { effect: "report-stopped", reason: "omp exited (code 0)" }, { effect: "stop-process" }, { effect: "close" }],
      });
      const failed = conversationStep("running", { type: "omp-acp.EXITED", code: 2, signal: null, details: "line 1\nline 2" }, autoExit);
      expect(failed.effects[0]).toEqual({ effect: "end-work", abnormal: "its command exited with code 2" });
      expect(failed.effects[1]).toEqual({ effect: "report-stopped", reason: "omp exited (code 2)", details: "line 1\nline 2" });
      const killed = conversationStep("running", { type: "omp-acp.EXITED", code: null, signal: "SIGKILL" }, autoExit);
      expect(killed.effects[0]).toEqual({ effect: "end-work", abnormal: "its process was ended by SIGKILL" });
      expect(killed.effects[1]).toEqual({ effect: "report-stopped", reason: "omp exited (SIGKILL)" });
      expect(conversationStep("running", { type: "omp-acp.EXITED", code: null, signal: null }, autoExit).effects[1]).toEqual({ effect: "report-stopped", reason: "omp exited" });
    }
  });

  test("a confirmed Stop cancels the turn and interrupts the question round, and stays in Agent running", () => {
    expect(conversationStep("running", { type: "developer.STOP_CHAT_AGENT" }, true)).toEqual({ state: "running", effects: [{ effect: "cancel-turn" }, { effect: "interrupt-questions" }] });
  });

  test("a confirmed close stops the process and ends the work as a closed terminal does", () => {
    const step = conversationStep("running", { type: "developer.CLOSE_CHAT_CONVERSATION" }, true);
    expect(step.state).toBe("closed");
    expect(step.effects).toEqual([{ effect: "stop-process" }, { effect: "end-work", abnormal: "its conversation was closed" }, { effect: "close" }]);
  });

  test("the window closing keeps the conversation and its work: nothing ends, nothing is deleted", () => {
    expect(conversationStep("running", { type: "editor.WINDOW_CLOSED" }, true)).toEqual({ state: "waiting", effects: [{ effect: "stop-process-for-window" }] });
  });
});

describe("Agent idle", () => {
  test("Trama no longer follows it: a new end of turn changes nothing", () => {
    expect(conversationStep("idle", { type: "omp-acp.TURN_ENDED", end: { stopReason: "refusal" } }, true)).toEqual({ state: "idle", effects: [] });
  });

  test("closing closes it; the process ending closes it with no notice; the window waiting keeps it", () => {
    expect(conversationStep("idle", { type: "developer.CLOSE_CHAT_CONVERSATION" }, false).state).toBe("closed");
    expect(conversationStep("idle", { type: "omp-acp.EXITED", code: 1, signal: null }, false)).toEqual({ state: "closed", effects: [{ effect: "end-work" }, { effect: "stop-process" }, { effect: "close" }] });
    expect(conversationStep("idle", { type: "editor.WINDOW_CLOSED" }, false).state).toBe("waiting");
  });

  test("an Ask more with no message yet goes to Closed when the window closes: its process stops and nothing is kept", () => {
    expect(conversationStep("idle", { type: "editor.WINDOW_CLOSED" }, false, true)).toEqual({ state: "closed", effects: [{ effect: "stop-process-for-window" }, { effect: "close" }] });
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

  test("a session that does not reopen closes it; a working one ends its work and reports it with the cause and the last lines of omp's error output", () => {
    const working = conversationStep("waiting", { type: "omp-acp.SESSION_NOT_RESUMED", wasRunning: true }, true);
    expect(working.state).toBe("closed");
    expect(working.effects).toEqual([{ effect: "report-stopped", reason: SESSION_NOT_RESUMED_REASON }, { effect: "end-work", abnormal: SESSION_NOT_RESUMED_REASON }, { effect: "close" }]);
    expect(SESSION_NOT_RESUMED_REASON).toBe("the agent's session could not be resumed");
    const explained = conversationStep("waiting", { type: "omp-acp.SESSION_NOT_RESUMED", wasRunning: true, cause: "omp exited with code 3", details: "boom" }, true);
    expect(explained.effects[0]).toEqual({ effect: "report-stopped", reason: `${SESSION_NOT_RESUMED_REASON} (omp exited with code 3)`, details: "boom" });
    const resting = conversationStep("waiting", { type: "omp-acp.SESSION_NOT_RESUMED", wasRunning: false }, true);
    expect(effects(resting.effects)).toEqual(["end-work", "close"]);
  });

  test("Closed receives nothing", () => {
    expect(conversationStep("closed", { type: "omp-acp.TURN_ENDED", end: { stopReason: "end_turn" } }, true)).toEqual({ state: "closed", effects: [] });
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
    hook: true,
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
      { id: "abc123", name: "T3", hook: true, job: entry.job },
      { id: "zzz999", name: "Scan", job: { id: "j2", kind: "scan", name: "Scan" } },
      {},
    ]);
  });

  test("an unreadable entry says whether it had the hook, so a conversation with no job saved still ends its work", () => {
    const read = readSavedConversations([{ id: "abc123", name: "Design", hook: true, state: "running" }, { id: "def456", name: "Ask", hook: false }]);
    expect(read.unreadable).toEqual([{ id: "abc123", name: "Design", hook: true }, { id: "def456", name: "Ask" }]);
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

  test("only the variables of Trama are saved of the environment, TRAMA_ACP among them", () => {
    expect(savedEnv({ TRAMA_AGENT: "1", TRAMA_ACP: "1", TRAMA_TERMINAL: "abc123", QUESTION_ENDPOINT: "sock", PATH: "/bin", TRAMA_JOB: "j", TRAMA_ADVISOR_SCANNER: "1", TRAMA_RUN: "1", PI_INTENT_TRACING: "0" })).toEqual({ TRAMA_AGENT: "1", TRAMA_ACP: "1", TRAMA_TERMINAL: "abc123", TRAMA_JOB: "j", TRAMA_ADVISOR_SCANNER: "1", TRAMA_RUN: "1", PI_INTENT_TRACING: "0" });
  });

  test("an entry saved before the explicit hook field reads as unreadable, so its job ends as a failed resume", () => {
    const { hook: _omit, ...before } = entry;
    const read = readSavedConversations([before]);
    expect(read.entries).toEqual([]);
    expect(read.unreadable).toEqual([{ id: "abc123", name: "T3", job: entry.job }]);
  });

  test("the resume decision: a working conversation gets the notice and the fixed prompt, a resting one only its history", () => {
    expect(resumeDecision({ state: "running", hook: true })).toEqual({ wasRunning: true, notice: RESUME_NOTICE, prompt: RESUME_PROMPT });
    expect(resumeDecision({ state: "running", hook: false })).toEqual({ wasRunning: false });
    // A job's conversation continues its work with or without the hook; the entry of a conversation that is not a job's carries no job.
    expect(resumeDecision({ state: "running", hook: false, job: entry.job })).toEqual({ wasRunning: true, notice: RESUME_NOTICE, prompt: RESUME_PROMPT });
    expect(resumeDecision({ state: "idle", hook: true })).toEqual({ wasRunning: false });
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
