import { afterEach, expect, mock, test } from "bun:test";
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

test("a continuous review: asked with the next tool, one at a time, notes delivered with the next tool along with the changes meanwhile", async () => {
  const root = run();
  await receiveCursorHook(hook(root, { hook: "afterFileEdit", file: "src/a.ts" }));
  const asked = (await receiveCursorHook(hook(root, { hook: "postToolUse" }))).text;
  expect(asked).toMatch(/^Trama's Advisor: start the trama-advisor sub-agent in the background for review \w{8} of these changes, and keep working without waiting for it: src\/a\.ts\.$/);
  expect(latest()?.agents).toEqual([{ agent: "main", text: false }]);
  // Nothing else is asked while the review goes on; the files wait for the next one.
  await receiveCursorHook(hook(root, { hook: "afterFileEdit", file: "src/b.ts" }));
  await receiveCursorHook(hook(root, { hook: "afterFileEdit", file: ".trama/tasks/x.md" }));
  expect((await receiveCursorHook(hook(root, { hook: "postToolUse" }))).text).toBeUndefined();
  // Notes arrive: they wait in memory until the agent's next tool.
  expect(receiveAdvisorReview({ review: reviewOf(asked), clean: false, notes: "The Task asks for X; the code does Y." })).toBe(true);
  expect(receiveAdvisorReview({ review: reviewOf(asked), clean: false, notes: "again" })).toBe(false);
  expect(latest()?.agents).toEqual([{ agent: "main", text: true }]);
  const delivered = (await receiveCursorHook(hook(root, { hook: "postToolUse" }))).text ?? "";
  expect(delivered).toContain("Trama's Advisor found that your Task's code drifts from the Model or the Requirements; fix it before you move the Task to Done: The Task asks for X; the code does Y.");
  expect(delivered).toMatch(/review \w{8} of these changes, and keep working without waiting for it: src\/b\.ts\.$/);
  expect(delivered).not.toContain(".trama/");
  expect(latest()?.agents).toEqual([{ agent: "main", text: false }]);
  expect(receiveAdvisorReview({ review: "unknown", clean: true })).toBe(false);
});

test("a clean continuous review with changes meanwhile asks for another review at the next tool", async () => {
  const root = run();
  await receiveCursorHook(hook(root, { hook: "afterFileEdit", file: "a.ts" }));
  const first = (await receiveCursorHook(hook(root, { hook: "postToolUse" }))).text;
  await receiveCursorHook(hook(root, { hook: "afterFileEdit", file: "b.ts" }));
  expect(receiveAdvisorReview({ review: reviewOf(first), clean: true })).toBe(true);
  const second = (await receiveCursorHook(hook(root, { hook: "postToolUse" }))).text;
  expect(second).toMatch(/for review \w{8} of these changes.*: b\.ts\.$/);
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
  expect(first).toMatch(/^Trama's Advisor: before you return, have the trama-advisor sub-agent do review \w{8} of your whole Task abc12345 and wait for its result; fix what it reports\./);
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
  expect(reply.text).toMatch(/^Trama's Advisor: before you finish, have the trama-advisor sub-agent do review \w{8} of the whole run and wait for its result; fix what it reports\.\nFiles not yet reviewed: b\.ts\.$/);
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

test("teardown", () => {
  for (const subscription of subscriptions) subscription.dispose();
});
