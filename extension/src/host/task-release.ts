import { processAlive, readAgentProcesses, removeAgentProcess } from "../../../src/core/agent-processes";
import { askFollowedHolders, questionProjectId } from "../../../src/core/question-channel";
import { cardName } from "../../../src/core/short-numbers";
import { projectAt } from "../../../src/core/store";
import { holdersToAsk, unfollowedTasks } from "../../../src/core/task-holders";
import { listTasks, releaseHeldTasks } from "../../../src/core/work";
import { followsAgent, reportStoppedFollowing } from "./drift-resolution";
import { ownWindowId } from "./questions";

/**
 * The execution check's release of Tasks nobody follows (`rules#time`): a Task taken by a Trama terminal (or the omp Chat
 * conversation that replaces it) that no open window of the project follows goes back to To do, and only when the agent
 * process registered for it is gone or was never registered. Without a window that answers, a window that does not
 * answer follows everything, so its Tasks stay taken until the next check. Only `taskId`, when given, is looked at.
 * Returns the identities of the Tasks this window released.
 */
export async function releaseUnfollowedTasks(root: string, taskId?: string): Promise<string[]> {
  const project = projectAt(root);
  const taken = listTasks(project)
    .filter((task) => task.data.agent && (taskId === undefined || task.id === taskId))
    .map((task) => ({ id: task.id, holder: task.data.holder }));
  const ask = holdersToAsk(taken, (holder) => followsAgent(root, holder));
  if (ask.length === 0) return [];
  const followedElsewhere = await askFollowedHolders(project, ask, { ownWindow: ownWindowId(root) });
  // An unreadable registry says nothing: no terminal is released for want of a registration.
  const processes = readAgentProcesses(questionProjectId(project));
  const gone = unfollowedTasks({
    tasks: taken,
    followedHere: (holder) => followsAgent(root, holder),
    followedElsewhere,
    terminalProcessAlive: (terminal) => {
      if (processes === undefined) return true;
      const registered = processes[terminal];
      return registered !== undefined && processAlive(registered.pid);
    },
  });
  if (gone.length === 0) return [];
  const held = taken.flatMap((task) => (gone.includes(task.id) && task.holder !== null ? [{ id: task.id, holder: task.holder }] : []));
  const released = releaseHeldTasks(projectAt(root), held);
  for (const task of released) reportStoppedFollowing(`${cardName(project, "task", task.id)} ${task.title}`, "no window follows its agent");
  return released.map((task) => task.id);
}

/**
 * Drops from the registry of agent processes every terminal no Task holds as its `agent` and no window follows (this
 * one or, asked once, another of the project); an unreadable registry is left alone. Returns the terminals dropped.
 */
export async function pruneAgentProcesses(root: string): Promise<string[]> {
  const project = projectAt(root);
  const projectId = questionProjectId(project);
  const processes = readAgentProcesses(projectId);
  if (processes === undefined) return [];
  const held = new Set(listTasks(project).filter((task) => task.data.agent && task.data.holder !== null).map((task) => task.data.holder));
  const candidates = Object.keys(processes).filter((terminal) => !held.has(terminal) && !followsAgent(root, terminal));
  if (candidates.length === 0) return [];
  const followedElsewhere = await askFollowedHolders(project, candidates, { ownWindow: ownWindowId(root) });
  const dropped = candidates.filter((terminal) => !followedElsewhere.has(terminal) && !followsAgent(root, terminal));
  for (const terminal of dropped) removeAgentProcess(projectId, terminal);
  return dropped;
}
