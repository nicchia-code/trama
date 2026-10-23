import { afterEach, expect, mock, test } from "bun:test";
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ChatState, CursorChatEvent, CursorHook } from "../src/core/cursor-chat";

mock.module("vscode", () => ({
  env: { appName: "Cursor" },
  extensions: { getExtension: () => undefined },
  window: {},
  workspace: {},
  commands: {},
}));

const { onChatState, onCursorChatEvent, receiveCursorHook } = await import("../extension/src/host/cursor");
const { bindChatJob, chatJobSendStarted, endChatJobs, jobFinalReviewMissing, onFinalReviewMissing, receiveAdvisorReview, setSnapshotSource, startJob } = await import("../extension/src/host/drift-resolution");

const roots: string[] = [];
let states: (ChatState | undefined)[] = [];
let events: CursorChatEvent[] = [];
const subscriptions = [
  onChatState((state) => states.push(state)),
  onCursorChatEvent((event) => void events.push(event)),
];
const latest = (): ChatState | undefined => states[states.length - 1];

setSnapshotSource(() => []);
afterEach(() => {
  for (const root of roots.splice(0)) endChatJobs(root, "main");
  states = [];
  events = [];
});

/** A chat Run with the Advisor Scanner on, bound to the conversation `main`. */
function run(): string {
  const root = join(tmpdir(), `trama-advisor-${crypto.randomUUID()}`);
  // The folder exists before the job starts, so the registry's key for the project never changes while the test creates files in it.
  mkdirSync(root, { recursive: true });
  roots.push(root);
  startJob("run", root, { chat: "cursor" }, chatJobSendStarted(root, "cursor"), "job1", undefined, true);
  bindChatJob(root, "main");
  return root;
}
const hook = (root: string, h: Partial<CursorHook> & Pick<CursorHook, "hook">, conversation = "main"): CursorHook => ({ conversation, root, ...h });
const reviewOf = (text: string | undefined): string => /review (\w{8}) /.exec(text ?? "")?.[1] ?? "";

test("the registry publishes the chat state: the Run's conversation is watched, and the state follows every change", async () => {
  const root = run();
  expect(latest()).toEqual({ root, conversations: [{ conversation: "main", job: "job1", advisor: true }], subagents: [], agents: [{ agent: "main", text: false }] });
  await receiveCursorHook(hook(root, { hook: "afterFileEdit", file: "src/a.ts" }));
  expect(latest()?.agents).toEqual([{ agent: "main", text: true }]);
  await receiveCursorHook(hook(root, { hook: "subagentStart", parent: "main", call: "call-1", subagentType: "generalPurpose" }));
  expect(latest()?.subagents).toEqual([{ call: "call-1", conversation: "main" }]);
  expect(endChatJobs(root, "main")).toHaveLength(1);
  expect(latest()).toEqual({ root, conversations: [], subagents: [], agents: [] });
});

test("a continuous review: asked with the next tool, one at a time, notes never added to a tool result and the changes meanwhile asked for as the next round", async () => {
  const root = run();
  await receiveCursorHook(hook(root, { hook: "afterFileEdit", file: "src/a.ts" }));
  const asked = (await receiveCursorHook(hook(root, { hook: "postToolUse" }))).text;
  expect(asked).toMatch(/^Trama's Advisor: start the trama-advisor sub-agent with run_in_background for review \w{8} of these changes and keep working; do not wait for it or check on it, Cursor delivers its result to you\. Changed files: src\/a\.ts\.$/);
  expect(latest()?.agents).toEqual([{ agent: "main", text: false }]);
  // Nothing else is asked while the review goes on; the files wait for the next one.
  await receiveCursorHook(hook(root, { hook: "afterFileEdit", file: "src/b.ts" }));
  await receiveCursorHook(hook(root, { hook: "afterFileEdit", file: ".trama/tasks/x.md" }));
  expect((await receiveCursorHook(hook(root, { hook: "postToolUse" }))).text).toBeUndefined();
  // Notes arrive: Cursor delivers them to the agent; Trama keeps them in memory and asks for the next round only.
  expect(receiveAdvisorReview({ review: reviewOf(asked), clean: false, notes: "The Task asks for X; the code does Y." })).toBe(true);
  expect(receiveAdvisorReview({ review: reviewOf(asked), clean: false, notes: "again" })).toBe(false);
  expect(latest()?.agents).toEqual([{ agent: "main", text: true }]);
  const delivered = (await receiveCursorHook(hook(root, { hook: "postToolUse" }))).text ?? "";
  expect(delivered).not.toContain("drifts from the Model");
  expect(delivered).not.toContain("The Task asks for X");
  expect(delivered).toMatch(/^Trama's Advisor: start the trama-advisor sub-agent with run_in_background for review \w{8} of these changes and keep working; do not wait for it or check on it, Cursor delivers its result to you\. Changed files: src\/b\.ts\.$/);
  expect(delivered).not.toContain(".trama/");
  expect(latest()?.agents).toEqual([{ agent: "main", text: false }]);
});

test("the notes of a continuous review without changes meanwhile are kept for the final review, and no tool result carries them", async () => {
  const root = run();
  await receiveCursorHook(hook(root, { hook: "afterFileEdit", file: "a.ts" }));
  const asked = (await receiveCursorHook(hook(root, { hook: "postToolUse" }))).text;
  expect(receiveAdvisorReview({ review: reviewOf(asked), clean: false, notes: "kept note" })).toBe(true);
  expect(latest()?.agents).toEqual([{ agent: "main", text: false }]);
  expect((await receiveCursorHook(hook(root, { hook: "postToolUse" }))).text).toBeUndefined();
  // A change after the round asks for a new round at once, from the listening state.
  await receiveCursorHook(hook(root, { hook: "afterFileEdit", file: "c.ts" }));
  expect((await receiveCursorHook(hook(root, { hook: "postToolUse" }))).text).toMatch(/c\.ts\.$/);
  await receiveCursorHook(hook(root, { hook: "beforeSubmitPrompt", tramaPrompt: true }));
  const final = (await receiveCursorHook(hook(root, { hook: "stop", status: "completed" }))).text ?? "";
  expect(final).toContain("before you finish");
  expect(final).toContain("kept note");
  expect(receiveAdvisorReview({ review: "unknown", clean: true })).toBe(false);
});

test("a clean continuous review with changes meanwhile asks for another review at the next tool", async () => {
  const root = run();
  await receiveCursorHook(hook(root, { hook: "afterFileEdit", file: "a.ts" }));
  const first = (await receiveCursorHook(hook(root, { hook: "postToolUse" }))).text;
  await receiveCursorHook(hook(root, { hook: "afterFileEdit", file: "b.ts" }));
  expect(receiveAdvisorReview({ review: reviewOf(first), clean: true })).toBe(true);
  const second = (await receiveCursorHook(hook(root, { hook: "postToolUse" }))).text;
  expect(second).toMatch(/for review \w{8} of these changes.*Changed files: b\.ts\.$/);
  expect(reviewOf(second)).not.toBe(reviewOf(first));
  expect(receiveAdvisorReview({ review: reviewOf(second), clean: true })).toBe(true);
  expect(latest()?.agents).toEqual([{ agent: "main", text: false }]);
});

test("a shell snapshot counts only the paths new or with another hash since the agent's last photograph", async () => {
  const root = run();
  const shell = (files: { path: string; hash?: string }[]) => receiveCursorHook(hook(root, { hook: "afterShellExecution", snapshot: files }));
  await shell([{ path: "a.ts", hash: "1" }]);
  const first = (await receiveCursorHook(hook(root, { hook: "postToolUse" }))).text;
  expect(first).toContain("a.ts.");
  expect(receiveAdvisorReview({ review: reviewOf(first), clean: true })).toBe(true);
  await shell([{ path: "a.ts", hash: "1" }]);
  expect((await receiveCursorHook(hook(root, { hook: "postToolUse" }))).text).toBeUndefined();
  await shell([{ path: "a.ts", hash: "2" }, { path: "gone.ts" }]);
  expect((await receiveCursorHook(hook(root, { hook: "postToolUse" }))).text).toContain("a.ts, gone.ts.");
});

test("a sub-agent is watched from the Task it takes, reviewed on its end at most three times, and never by the other agents' notes", async () => {
  const root = run();
  await receiveCursorHook(hook(root, { hook: "subagentStart", parent: "main", call: "call-1", subagentType: "generalPurpose" }));
  await receiveCursorHook(hook(root, { hook: "subagentStart", parent: "main", call: "call-adv", subagentType: "trama-advisor" }));
  expect(latest()?.agents).toEqual([{ agent: "main", text: false }]);
  await receiveCursorHook(hook(root, { hook: "afterShellExecution", tramaWork: true, takenTask: "abc12345" }, "child-1"));
  expect(latest()?.agents).toEqual([{ agent: "main", text: false }, { agent: "child-1", text: false }]);
  // The sub-agent's change asks for its own review, with its own text.
  await receiveCursorHook(hook(root, { hook: "afterFileEdit", file: "child.ts" }, "child-1"));
  expect(latest()?.agents).toEqual([{ agent: "main", text: false }, { agent: "child-1", text: true }]);
  const continuous = (await receiveCursorHook(hook(root, { hook: "postToolUse" }, "child-1"))).text;
  expect(continuous).toContain("child.ts.");
  receiveAdvisorReview({ review: reviewOf(continuous), clean: false, notes: "child notes" });
  const stop = (call: string) => receiveCursorHook(hook(root, { hook: "subagentStop", status: "completed", call, child: "child-1", modifiedFiles: [] }));
  const first = (await stop("call-1")).text ?? "";
  expect(first).toMatch(/^Trama's Advisor: before you return, have the trama-advisor sub-agent, in the foreground, do review \w{8} of your whole Task abc12345 and wait for its result; fix what it reports\. Ignore the result of any earlier background review\./);
  expect(first).toContain("child notes");
  // The sub-agent corrects and ends again: asked again, up to three times, then it returns.
  receiveAdvisorReview({ review: reviewOf(first), clean: false, notes: "fix it" });
  const second = (await stop("call-1")).text;
  expect(reviewOf(second)).not.toBe(reviewOf(first));
  expect(receiveAdvisorReview({ review: reviewOf(first), clean: true })).toBe(false);
  expect((await stop("call-1")).text).toContain("do review");
  expect((await stop("call-1")).text).toBeUndefined();
  expect(latest()?.agents).toEqual([{ agent: "main", text: false }]);
  expect(latest()?.subagents).toEqual([{ call: "call-adv", conversation: "main" }]);
  // The advisor's own end is nobody's review.
  expect((await receiveCursorHook(hook(root, { hook: "subagentStop", status: "completed", call: "call-adv", child: "adv-1", modifiedFiles: [] }))).text).toBeUndefined();
  expect(latest()?.subagents).toEqual([]);
});

test("a clean Task review lets the sub-agent return, and an interrupted sub-agent is no longer watched", async () => {
  const root = run();
  await receiveCursorHook(hook(root, { hook: "subagentStart", parent: "main", call: "call-1", subagentType: "generalPurpose" }));
  await receiveCursorHook(hook(root, { hook: "afterShellExecution", tramaWork: true, takenTask: "abc12345" }, "child-1"));
  const asked = (await receiveCursorHook(hook(root, { hook: "subagentStop", status: "completed", call: "call-1", child: "child-1", modifiedFiles: [] }))).text;
  expect(receiveAdvisorReview({ review: reviewOf(asked), clean: true })).toBe(true);
  expect(latest()?.agents).toEqual([{ agent: "main", text: false }]);
  await receiveCursorHook(hook(root, { hook: "subagentStart", parent: "main", call: "call-2", subagentType: "generalPurpose" }));
  await receiveCursorHook(hook(root, { hook: "afterShellExecution", tramaWork: true, takenTask: "def" }, "child-2"));
  expect(latest()?.agents).toHaveLength(2);
  await receiveCursorHook(hook(root, { hook: "subagentStop", status: "aborted", call: "call-2", child: "child-2", modifiedFiles: [] }));
  expect(latest()?.agents).toEqual([{ agent: "main", text: false }]);
});

test("the main agent's turn is continued with the final review, and a clean result lets the Run finish with no warning", async () => {
  const root = run();
  await receiveCursorHook(hook(root, { hook: "beforeSubmitPrompt", tramaPrompt: true }));
  const stopped = (): Promise<unknown> => receiveCursorHook(hook(root, { hook: "stop", status: "completed" }));
  await receiveCursorHook(hook(root, { hook: "afterFileEdit", file: "a.ts" }));
  await receiveCursorHook(hook(root, { hook: "postToolUse" }));
  await receiveCursorHook(hook(root, { hook: "afterFileEdit", file: "b.ts" }));
  const reply = await receiveCursorHook(hook(root, { hook: "stop", status: "completed" }));
  expect(reply.text).toMatch(/^Trama's Advisor: before you finish, have the trama-advisor sub-agent, in the foreground, do review \w{8} of the whole run and wait for its result; fix what it reports\. Ignore the result of any earlier background review\.\nFiles not yet reviewed: b\.ts\.$/);
  expect(events.map((e) => e.event)).toContain("TURN_FINISHING");
  expect(events.map((e) => e.event)).not.toContain("AGENT_STOPPED");
  expect(receiveAdvisorReview({ review: reviewOf(reply.text), clean: true })).toBe(true);
  expect(latest()?.conversations).toEqual([{ conversation: "main", job: "job1", advisor: false }]);
  await stopped();
  expect(events.map((e) => e.event).filter((e) => e === "AGENT_STOPPED")).toHaveLength(1);
  expect(jobFinalReviewMissing(root, "job1")).toBeUndefined();
});

test("the third final review request without a result ends the Run with the warning reason", async () => {
  const root = run();
  await receiveCursorHook(hook(root, { hook: "beforeSubmitPrompt", tramaPrompt: true }));
  const stop = () => receiveCursorHook(hook(root, { hook: "stop", status: "completed" }));
  const reviews = [reviewOf((await stop()).text)];
  await receiveCursorHook(hook(root, { hook: "beforeSubmitPrompt", tramaPrompt: true }));
  reviews.push(reviewOf((await stop()).text));
  await receiveCursorHook(hook(root, { hook: "beforeSubmitPrompt", tramaPrompt: true }));
  reviews.push(reviewOf((await stop()).text));
  expect(new Set(reviews).size).toBe(3);
  await receiveCursorHook(hook(root, { hook: "beforeSubmitPrompt", tramaPrompt: true }));
  expect(await stop()).toEqual({});
  expect(events.at(-1)?.event).toBe("AGENT_STOPPED");
  expect(jobFinalReviewMissing(root, "job1")).toBe("the agent did not wait for the review");
});

test("a Run interrupted before its final review is recorded, a closed conversation is not", async () => {
  const root = run();
  await receiveCursorHook(hook(root, { hook: "beforeSubmitPrompt", tramaPrompt: true }));
  await receiveCursorHook(hook(root, { hook: "stop", status: "aborted" }));
  expect(jobFinalReviewMissing(root, "job1")).toBe("the run was interrupted");
  const closed = run();
  await receiveCursorHook(hook(closed, { hook: "beforeSubmitPrompt", tramaPrompt: true }));
  await receiveCursorHook(hook(closed, { hook: "sessionEnd", reason: "user_close" }));
  expect(jobFinalReviewMissing(closed, "job1")).toBeUndefined();
});

test("the Board hears once of each Run that ended without its final review, and never of a closed or reviewed one", async () => {
  const heard: string[] = [];
  const sub = onFinalReviewMissing((reason) => heard.push(reason));
  try {
    const root = run();
    await receiveCursorHook(hook(root, { hook: "beforeSubmitPrompt", tramaPrompt: true }));
    await receiveCursorHook(hook(root, { hook: "stop", status: "aborted" }));
    await receiveCursorHook(hook(root, { hook: "sessionEnd", reason: "user_close" }));
    const closed = run();
    await receiveCursorHook(hook(closed, { hook: "beforeSubmitPrompt", tramaPrompt: true }));
    await receiveCursorHook(hook(closed, { hook: "sessionEnd", reason: "user_close" }));
    expect(heard).toEqual(["the run was interrupted"]);
  } finally {
    sub.dispose();
  }
});

test("a Run without the Advisor Scanner is never watched", async () => {
  const root = join(tmpdir(), `trama-advisor-${crypto.randomUUID()}`);
  roots.push(root);
  startJob("run", root, { chat: "cursor" }, chatJobSendStarted(root, "cursor"), "plain");
  bindChatJob(root, "main");
  expect(latest()).toEqual({ root, conversations: [{ conversation: "main", job: "plain", advisor: false }], subagents: [], agents: [] });
  await receiveCursorHook(hook(root, { hook: "afterFileEdit", file: "a.ts" }));
  expect((await receiveCursorHook(hook(root, { hook: "postToolUse" }))).text).toBeUndefined();
});

test("a round names the agent's transcript and the byte position of its conversation since the last round, measured by size and never read", async () => {
  const root = run();
  const dir = join(root, "agent-transcripts", "main");
  mkdirSync(dir, { recursive: true });
  const transcript = join(dir, "main.jsonl");
  writeFileSync(transcript, "x".repeat(100));
  await receiveCursorHook(hook(root, { hook: "afterFileEdit", file: "a.ts", transcript }));
  const first = (await receiveCursorHook(hook(root, { hook: "postToolUse" }))).text ?? "";
  expect(first).toEndWith(`Changed files: a.ts. Your conversation since the last review: ${transcript} from byte 0.`);
  // The position is the size when the previous round was asked for; the next hooks need no path again.
  appendFileSync(transcript, "y".repeat(50));
  await receiveCursorHook(hook(root, { hook: "afterFileEdit", file: "b.ts" }));
  expect(receiveAdvisorReview({ review: reviewOf(first), clean: true })).toBe(true);
  const second = (await receiveCursorHook(hook(root, { hook: "postToolUse" }))).text ?? "";
  expect(second).toEndWith(`Changed files: b.ts. Your conversation since the last review: ${transcript} from byte 100.`);
  appendFileSync(transcript, "z".repeat(25));
  expect(receiveAdvisorReview({ review: reviewOf(second), clean: true })).toBe(true);
  await receiveCursorHook(hook(root, { hook: "afterFileEdit", file: "c.ts", transcript }));
  expect((await receiveCursorHook(hook(root, { hook: "postToolUse" }))).text).toEndWith(`from byte 150.`);
  // The state file holds identities and flags only.
  expect(JSON.stringify(latest())).not.toContain("agent-transcripts");
});

test("a round without a transcript, or with one that is missing, reviews the files only", async () => {
  const root = run();
  await receiveCursorHook(hook(root, { hook: "afterFileEdit", file: "a.ts" }));
  const none = (await receiveCursorHook(hook(root, { hook: "postToolUse" }))).text ?? "";
  expect(none).toEndWith("Changed files: a.ts.");
  expect(receiveAdvisorReview({ review: reviewOf(none), clean: true })).toBe(true);
  const missing = join(root, "nowhere", "main.jsonl");
  await receiveCursorHook(hook(root, { hook: "afterFileEdit", file: "b.ts", transcript: missing }));
  const second = (await receiveCursorHook(hook(root, { hook: "postToolUse" }))).text ?? "";
  expect(second).toEndWith("Changed files: b.ts.");
  expect(second).not.toContain("conversation");
  expect(receiveAdvisorReview({ review: reviewOf(second), clean: true })).toBe(true);
  // Once the file exists the first position is still 0: nothing was measured before.
  mkdirSync(join(root, "nowhere"), { recursive: true });
  writeFileSync(missing, "abc");
  await receiveCursorHook(hook(root, { hook: "afterFileEdit", file: "c.ts" }));
  expect((await receiveCursorHook(hook(root, { hook: "postToolUse" }))).text).toEndWith(`Your conversation since the last review: ${missing} from byte 0.`);
});

test("a sub-agent's transcript is derived from the folder of the main conversation's transcript", async () => {
  const root = run();
  const dir = join(root, "agent-transcripts", "main");
  mkdirSync(join(dir, "subagents"), { recursive: true });
  const transcript = join(dir, "main.jsonl");
  const child = join(dir, "subagents", "child-1.jsonl");
  writeFileSync(transcript, "main");
  writeFileSync(child, "0123456789");
  await receiveCursorHook(hook(root, { hook: "afterFileEdit", file: "a.ts", transcript }));
  await receiveCursorHook(hook(root, { hook: "subagentStart", parent: "main", call: "call-1", subagentType: "generalPurpose" }));
  await receiveCursorHook(hook(root, { hook: "afterShellExecution", tramaWork: true, takenTask: "abc12345" }, "child-1"));
  await receiveCursorHook(hook(root, { hook: "afterFileEdit", file: "child.ts" }, "child-1"));
  const asked = (await receiveCursorHook(hook(root, { hook: "postToolUse" }, "child-1"))).text ?? "";
  expect(asked).toEndWith(`Changed files: child.ts. Your conversation since the last review: ${child} from byte 0.`);
  // Its own position follows its own file, apart from the main agent's.
  appendFileSync(child, "abcde");
  await receiveCursorHook(hook(root, { hook: "afterFileEdit", file: "child2.ts" }, "child-1"));
  expect(receiveAdvisorReview({ review: reviewOf(asked), clean: true })).toBe(true);
  expect((await receiveCursorHook(hook(root, { hook: "postToolUse" }, "child-1"))).text).toEndWith(`from byte 10.`);
});

test("a round still going when the Task review or the final review is asked no longer counts: its result is ignored and its notes are not kept", async () => {
  const root = run();
  await receiveCursorHook(hook(root, { hook: "subagentStart", parent: "main", call: "call-1", subagentType: "generalPurpose" }));
  await receiveCursorHook(hook(root, { hook: "afterShellExecution", tramaWork: true, takenTask: "abc12345" }, "child-1"));
  await receiveCursorHook(hook(root, { hook: "afterFileEdit", file: "child.ts" }, "child-1"));
  const childRound = (await receiveCursorHook(hook(root, { hook: "postToolUse" }, "child-1"))).text;
  const taskReview = (await receiveCursorHook(hook(root, { hook: "subagentStop", status: "completed", call: "call-1", child: "child-1", modifiedFiles: [] }))).text ?? "";
  expect(taskReview).toContain("in the foreground");
  expect(taskReview).not.toContain("late child note");
  expect(receiveAdvisorReview({ review: reviewOf(childRound), clean: false, notes: "late child note" })).toBe(false);
  expect(receiveAdvisorReview({ review: reviewOf(taskReview), clean: true })).toBe(true);

  await receiveCursorHook(hook(root, { hook: "beforeSubmitPrompt", tramaPrompt: true }));
  await receiveCursorHook(hook(root, { hook: "afterFileEdit", file: "a.ts" }));
  const round = (await receiveCursorHook(hook(root, { hook: "postToolUse" }))).text;
  const final = (await receiveCursorHook(hook(root, { hook: "stop", status: "completed" }))).text ?? "";
  expect(final).toContain("in the foreground");
  expect(receiveAdvisorReview({ review: reviewOf(round), clean: false, notes: "late main note" })).toBe(false);
  expect(receiveAdvisorReview({ review: reviewOf(final), clean: true })).toBe(true);
  // Nothing of the ignored rounds comes back in a later request.
  expect(final).not.toContain("late main note");
});

test("teardown", () => {
  for (const subscription of subscriptions) subscription.dispose();
});
