import { readAgentProcesses, sameProcess } from "../../../src/core/agent-processes";
import { askFollowedHolders, questionProjectId } from "../../../src/core/question-channel";
import { projectAt } from "../../../src/core/store";
import { type FollowFacts, holdersToAsk } from "../../../src/core/task-holders";
import { followsHolder } from "./followed-holders";
import { ownWindowId } from "./questions";

/**
 * Gathers who follows `holders` (`rules#time`): this window, and, for the ones it does not, the other live windows of the
 * project, the window the registered process names asked first. For the holders no window follows the registered process
 * decides: it counts only when it is still the process registered (`sameProcess`), the one program the check starts to read
 * its start, and only for these holders. An unreadable registry says nothing, so no holder is given up for want of a registration.
 * The execution check and the window that opens the project (orphan announcements) decide from the same facts.
 */
export async function followFacts(root: string, holders: readonly (string | null)[]): Promise<FollowFacts> {
  const project = projectAt(root);
  const ask = holdersToAsk(holders, followsHolder);
  const processes = ask.length === 0 ? {} : readAgentProcesses(questionProjectId(project));
  const registered = Object.fromEntries(ask.map((holder) => [holder, processes?.[holder]?.window]));
  const followedElsewhere = ask.length === 0 ? new Set<string>() : await askFollowedHolders(project, ask, { ownWindow: ownWindowId(root), registered });
  const alive = new Set<string>();
  for (const holder of ask) {
    if (followedElsewhere.has(holder)) continue;
    if (processes === undefined || (await sameProcess(processes[holder]))) alive.add(holder);
  }
  return { followedHere: followsHolder, followedElsewhere, terminalProcessAlive: (holder) => alive.has(holder) };
}
