import { readAgentProcesses, removeAgentProcess } from "../../../src/core/agent-processes";
import { listAnnouncements } from "../../../src/core/announcements";
import { claimHolders, releaseTerminalClaims } from "../../../src/core/claims";
import { askFollowedHolders, questionProjectId } from "../../../src/core/question-channel";
import { cardName } from "../../../src/core/short-numbers";
import { projectAt } from "../../../src/core/store";
import { unfollowedAnnouncements, unfollowedHolders, unfollowedTasks } from "../../../src/core/task-holders";
import { listTasks, releaseHeldTasks } from "../../../src/core/work";
import { withdrawWaiting } from "./announcements";
import { reportStoppedFollowing } from "./drift-resolution";
import { followFacts } from "./follow-facts";
import { followsHolder } from "./followed-holders";
import { ownWindowId } from "./questions";

/**
 * The execution check's release of what nobody follows (`rules#time`): a Task taken by a Trama terminal (or the omp Chat
 * conversation that is its identity) goes back to To do, an announcement of one is withdrawn (with the notice of an
 * announcement not delivered, none for a work) and every claim of its files is forgotten, when no open window of the
 * project follows that holder and the process registered for it is gone, is not the same process any more or was never
 * registered. Only the Task `taskId`, when given, is looked at, and then no announcement and no claim. Returns the
 * identities of the Tasks this window released, of the announcements it withdrew and the holders whose claims it forgot.
 */
export async function releaseUnfollowed(root: string, taskId?: string): Promise<{ tasks: string[]; announcements: string[]; claims: string[] }> {
  const project = projectAt(root);
  const taken = listTasks(project)
    .filter((task) => task.data.agent && (taskId === undefined || task.id === taskId))
    .map((task) => ({ id: task.id, holder: task.data.holder }));
  const owned = taskId === undefined ? listAnnouncements(project).map((a) => ({ id: a.id, terminal: a.terminal })) : [];
  const claiming = taskId === undefined ? claimHolders(root) : [];
  if (taken.length === 0 && owned.length === 0 && claiming.length === 0) return { tasks: [], announcements: [], claims: [] };
  const facts = await followFacts(root, [...taken.map((task) => task.holder), ...owned.map((a) => a.terminal), ...claiming]);
  const goneTasks = unfollowedTasks({ tasks: taken, ...facts });
  const goneAnnouncements = new Set(unfollowedAnnouncements({ announcements: owned, ...facts }));
  const goneClaims = unfollowedHolders(claiming, facts);
  const held = taken.flatMap((task) => (goneTasks.includes(task.id) && task.holder !== null ? [{ id: task.id, holder: task.holder }] : []));
  // A Task that has another holder by the time it is written is not released: `releaseHeldTasks` reads the Tasks again as it writes.
  const released = held.length === 0 ? [] : releaseHeldTasks(projectAt(root), held);
  for (const task of released) reportStoppedFollowing(`${cardName(project, "task", task.id)} ${task.title}`, "no window follows its agent");
  if (goneAnnouncements.size > 0) withdrawWaiting(root, (announcement) => goneAnnouncements.has(announcement.id));
  for (const holder of goneClaims) releaseTerminalClaims(root, holder);
  return { tasks: released.map((task) => task.id), announcements: [...goneAnnouncements], claims: goneClaims };
}

/**
 * Drops from the registry of agent processes every terminal no Task holds as its `agent`, no announcement belongs to, no
 * claim names and no window follows (this one or, asked once, another of the project); an unreadable registry is left alone.
 * Returns the terminals dropped.
 */
export async function pruneAgentProcesses(root: string): Promise<string[]> {
  const project = projectAt(root);
  const projectId = questionProjectId(project);
  const processes = readAgentProcesses(projectId);
  if (processes === undefined) return [];
  const held = new Set([
    ...listTasks(project).filter((task) => task.data.agent && task.data.holder !== null).map((task) => task.data.holder),
    ...listAnnouncements(project).map((a) => a.terminal),
    ...claimHolders(root),
  ]);
  const candidates = Object.keys(processes).filter((terminal) => !held.has(terminal) && !followsHolder(terminal));
  if (candidates.length === 0) return [];
  const registered = Object.fromEntries(candidates.map((terminal) => [terminal, processes[terminal]?.window]));
  const followedElsewhere = await askFollowedHolders(project, candidates, { ownWindow: ownWindowId(root), registered });
  const dropped = candidates.filter((terminal) => !followedElsewhere.has(terminal) && !followsHolder(terminal));
  for (const terminal of dropped) removeAgentProcess(projectId, terminal);
  return dropped;
}
