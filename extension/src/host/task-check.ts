import type { TaskCheckReply } from "../../../src/core/question-channel";
import { projectAt } from "../../../src/core/store";
import { isKnownHolder } from "../../../src/core/task-holders";
import { getTask } from "../../../src/core/work";
import { checkAgentTerminals } from "./agent";
import { releaseUnfollowed } from "./task-release";

/**
 * `agent.CHECK_TASK`: this window runs at once, for the Task `taskId` only, the execution check of `rules#time`. A Task held
 * by a terminal this window follows gets the terminal check; any other Task gets the release of Tasks no window follows,
 * which asks the other windows. A release puts the Task back in To do and shows the notice on this window's Board.
 * Answers `released` with the reason, `alive` with the holder, or `unknown-holder` when the Task is not held by a holder this window recognises.
 */
export async function checkTaskHolder(root: string, taskId: string): Promise<TaskCheckReply> {
  const project = projectAt(root);
  const held = (): { holder: string } | undefined => {
    const task = getTask(project, taskId);
    return task.data.column === "doing" && task.data.agent && isKnownHolder(task.data.holder) ? { holder: task.data.holder } : undefined;
  };
  const before = held();
  if (before === undefined) return { result: "unknown-holder" };
  const terminal = (await checkAgentTerminals(before.holder)).find((checked) => checked.reason !== undefined);
  if (terminal?.reason !== undefined) return { result: "released", reason: terminal.reason };
  const after = held();
  if (after === undefined) return { result: "released", reason: "its agent is gone" };
  if ((await releaseUnfollowed(root, taskId)).tasks.includes(taskId)) return { result: "released", reason: "no window follows its agent" };
  const still = held();
  return still === undefined ? { result: "released", reason: "its agent is gone" } : { result: "alive", holder: still.holder };
}
