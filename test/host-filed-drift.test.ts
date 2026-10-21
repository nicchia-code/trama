import { expect, test } from "bun:test";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { localProjectJobs, driftsFinishing, chatTurnEnded, chatTurnStarted, endTerminalJobs, followsAgent, proposalsFinishing, receiveNotice, releaseFiledWork, setHooked, startJob, tasksFinishing } from "../extension/src/host/drift-resolution";

const root = () => join(tmpdir(), `trama-filed-drift-${crypto.randomUUID()}`);

test("a Drift filed by an agent is held until the end of that agent's turn, and only there", () => {
  const project = root();
  receiveNotice({ type: "drift-filed", root: project, drift: "0a1b2c3d", holder: "terminal-1" });
  receiveNotice({ type: "drift-filed", root: project, drift: "4e5f6a7b", holder: "terminal-2" });
  expect(driftsFinishing(project).sort()).toEqual(["0a1b2c3d", "4e5f6a7b"]);
  releaseFiledWork(project, "terminal-1");
  expect(driftsFinishing(project)).toEqual(["4e5f6a7b"]);
  receiveNotice({ type: "turn-ended", root: project, holder: "terminal-2" });
  expect(driftsFinishing(project)).toEqual([]);
});

test("a turn ended in another window releases the Drifts here too, and other projects keep theirs", () => {
  const project = root();
  const other = root();
  receiveNotice({ type: "drift-filed", root: project, drift: "0a1b2c3d", holder: "cursor" });
  receiveNotice({ type: "drift-filed", root: other, drift: "9c8d7e6f", holder: "cursor" });
  receiveNotice({ type: "turn-ended", root: project, holder: "cursor" });
  expect(driftsFinishing(project)).toEqual([]);
  expect(driftsFinishing(other)).toEqual(["9c8d7e6f"]);
});

test("a Proposal delivered by an agent is held until the end of that agent's turn, apart from the Drifts", () => {
  const project = root();
  receiveNotice({ type: "proposal-delivered", root: project, proposal: "iwham416", holder: "terminal-1" });
  receiveNotice({ type: "drift-filed", root: project, drift: "0a1b2c3d", holder: "terminal-1" });
  expect(proposalsFinishing(project)).toEqual(["iwham416"]);
  expect(driftsFinishing(project)).toEqual(["0a1b2c3d"]);
  receiveNotice({ type: "turn-ended", root: project, holder: "terminal-1" });
  expect(proposalsFinishing(project)).toEqual([]);
  expect(driftsFinishing(project)).toEqual([]);
});

test("a Task filed by an agent is held until the end of that agent's turn, and only there", () => {
  const project = root();
  receiveNotice({ type: "task-filed", root: project, task: "weg568kv", holder: "terminal-1" });
  receiveNotice({ type: "task-filed", root: project, task: "0p1q2r3s", holder: "terminal-2" });
  expect(tasksFinishing(project).sort()).toEqual(["0p1q2r3s", "weg568kv"]);
  receiveNotice({ type: "turn-ended", root: project, holder: "terminal-1" });
  expect(tasksFinishing(project)).toEqual(["0p1q2r3s"]);
  receiveNotice({ type: "turn-ended", root: project, holder: "terminal-1" });
  expect(tasksFinishing(project)).toEqual(["0p1q2r3s"]);
});

test("a Drift the advisor files during an omp Run is held until that Run's turn ends, and the Run stays active meanwhile", () => {
  const project = root();
  startJob("run", project, { terminal: "advisor-turn" }, undefined, "advisor-turn-job");
  receiveNotice({ type: "drift-filed", root: project, drift: "adv0d1f7", holder: "advisor-turn" });
  expect(driftsFinishing(project)).toEqual(["adv0d1f7"]);
  expect(localProjectJobs(project).some((job) => job.id === "advisor-turn-job")).toBe(true);
  releaseFiledWork(project, "advisor-turn");
  expect(driftsFinishing(project)).toEqual([]);
  endTerminalJobs("advisor-turn");
  expect(localProjectJobs(project).some((job) => job.id === "advisor-turn-job")).toBe(false);
});

test("a window follows its agent only for a hooked Trama terminal or a chat with a Trama job in progress", () => {
  setHooked("terminal-hooked", true);
  setHooked("terminal-plain", false);
  expect(followsAgent(root(), "terminal-hooked")).toBe(true);
  expect(followsAgent(root(), "terminal-plain")).toBe(false);
  expect(followsAgent(root(), "terminal-unknown")).toBe(false);
  expect(followsAgent(root(), "cursor")).toBe(false);
});

test("a card filed by a conversation waits only for that conversation's turn to end", () => {
  const project = root();
  receiveNotice({ type: "drift-filed", root: project, drift: "0a1b2c3d", holder: "cursor", conversation: "conv-a" });
  receiveNotice({ type: "task-filed", root: project, task: "weg568kv", holder: "cursor", conversation: "conv-b" });
  receiveNotice({ type: "proposal-delivered", root: project, proposal: "iwham416", holder: "cursor" });
  receiveNotice({ type: "turn-ended", root: project, holder: "cursor", conversation: "conv-a" });
  expect(driftsFinishing(project)).toEqual([]);
  expect(tasksFinishing(project)).toEqual(["weg568kv"]);
  // A card of a chat without conversation waits for any conversation's end.
  expect(proposalsFinishing(project)).toEqual([]);
  receiveNotice({ type: "turn-ended", root: project, holder: "cursor", conversation: "conv-a" });
  expect(tasksFinishing(project)).toEqual(["weg568kv"]);
  receiveNotice({ type: "turn-ended", root: project, holder: "cursor", conversation: "conv-b" });
  expect(tasksFinishing(project)).toEqual([]);
});

test("a chat card is followed only while its conversation (or any Trama conversation) has a turn in progress", () => {
  const project = root();
  expect(followsAgent(project, "cursor", "conv-a")).toBe(false);
  expect(followsAgent(project, "cursor")).toBe(false);
  chatTurnStarted(project, "conv-a");
  expect(followsAgent(project, "cursor", "conv-a")).toBe(true);
  expect(followsAgent(project, "cursor", "conv-b")).toBe(false);
  expect(followsAgent(project, "cursor")).toBe(true);
  chatTurnEnded(project, "conv-a");
  chatTurnEnded(project, "conv-a");
  expect(followsAgent(project, "cursor", "conv-a")).toBe(false);
  expect(followsAgent(project, "cursor")).toBe(false);
});
