import { afterEach, expect, test } from "bun:test";
import {
  bindChatJob,
  bindCopilotChatJob,
  chatJobSendStarted,
  driftResolution,
  endChatJobs,
  endCopilotChatJobs,
  startJob,
} from "../extension/src/host/drift-resolution";

const roots: string[] = [];
const root = () => {
  const value = `/tmp/trama-chat-job-${crypto.randomUUID()}`;
  roots.push(value);
  return value;
};
afterEach(() => {
  for (const value of roots.splice(0)) {
    endCopilotChatJobs(value, "first");
    endCopilotChatJobs(value, "second");
    endChatJobs(value, "cursor");
  }
});

test("Copilot sends bind in order and only their own conversation ends each job", () => {
  const project = root();
  startJob("run", project, { chat: "copilot" }, false);
  startJob("run", project, { chat: "copilot" }, false);
  bindCopilotChatJob(project, "first");
  bindCopilotChatJob(project, "second");
  expect(driftResolution()).toBe("running-tasks");
  endCopilotChatJobs(project, "unrelated");
  endCopilotChatJobs(project, "first");
  expect(driftResolution()).toBe("running-tasks");
  endCopilotChatJobs(project, "second");
  expect(driftResolution()).toBe("free");
});

test("a resolving Copilot conversation leaves concurrent Runs active until each conversation ends", () => {
  const project = root();
  startJob("run", project, { chat: "copilot" }, false);
  startJob("resolve", project, { chat: "copilot" }, false);
  bindCopilotChatJob(project, "first");
  bindCopilotChatJob(project, "second");
  expect(driftResolution()).toBe("resolving");
  endCopilotChatJobs(project, "second");
  expect(driftResolution()).toBe("running-tasks");
  endCopilotChatJobs(project, "first");
  expect(driftResolution()).toBe("free");
});

test("Cursor chat matching stays separate from Copilot conversations", () => {
  const project = root();
  startJob("run", project, { chat: "cursor" }, false);
  bindCopilotChatJob(project, "same-id");
  expect(driftResolution()).toBe("running-tasks");
  endCopilotChatJobs(project, "same-id");
  expect(driftResolution()).toBe("running-tasks");
  bindChatJob(project, "cursor");
  endChatJobs(project, "cursor");
  expect(driftResolution()).toBe("free");
});

test("prompts during preparation are ignored but prompts and ends during delivery are retained", () => {
  const project = root();
  bindCopilotChatJob(project, "preparation");
  endCopilotChatJobs(project, "preparation");
  const sentAfter = chatJobSendStarted(project, "copilot");
  startJob("run", project, { chat: "copilot" }, false, sentAfter);
  expect(driftResolution()).toBe("running-tasks");
  endCopilotChatJobs(project, "preparation");
  expect(driftResolution()).toBe("running-tasks");
  bindCopilotChatJob(project, "delivery");
  endCopilotChatJobs(project, "delivery");
  expect(driftResolution()).toBe("free");

  const finishedDuringDelivery = root();
  const finishedAfter = chatJobSendStarted(finishedDuringDelivery, "copilot");
  bindCopilotChatJob(finishedDuringDelivery, "finished");
  endCopilotChatJobs(finishedDuringDelivery, "finished");
  startJob("resolve", finishedDuringDelivery, { chat: "copilot" }, false, finishedAfter);
  expect(driftResolution()).toBe("free");

  const activeDuringDelivery = root();
  const activeAfter = chatJobSendStarted(activeDuringDelivery, "copilot");
  bindCopilotChatJob(activeDuringDelivery, "active");
  startJob("run", activeDuringDelivery, { chat: "copilot" }, false, activeAfter);
  expect(driftResolution()).toBe("running-tasks");
  endCopilotChatJobs(activeDuringDelivery, "active");
  expect(driftResolution()).toBe("free");
});
