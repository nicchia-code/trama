/** A Task taken by the agent, as the execution check sees it: its identity and who holds it (`agent` of the Task file). */
export interface TakenTask {
  id: string;
  holder: string | null;
}

/** The facts the check has gathered about who follows the holders of the taken Tasks. */
export interface HolderFacts {
  tasks: TakenTask[];
  /** Whether this window itself follows the holder (a terminal in Agent running, a conversation with a job). */
  followedHere: (holder: string) => boolean;
  /** The holders another live window of the project says it follows; a window that did not answer in time follows every holder asked. */
  followedElsewhere: ReadonlySet<string>;
  /** For a terminal holder: whether the agent process registered for it is still alive; false when none is registered. */
  terminalProcessAlive: (terminal: string) => boolean;
}

/** The holder of a Task Trama can tell: a Trama terminal or a conversation of Cursor's chat. `true`, `cursor` and no holder name nobody. */
export const isKnownHolder = (holder: string | null): holder is string => holder !== null && holder !== "cursor";

/** The distinct holders the check has to ask the other windows about: taken Tasks of a known holder this window does not follow. */
export function holdersToAsk(tasks: readonly TakenTask[], followedHere: (holder: string) => boolean): string[] {
  return [...new Set(tasks.map((t) => t.holder).filter(isKnownHolder).filter((holder) => !followedHere(holder)))];
}

/**
 * The taken Tasks nobody follows any more: no window follows their terminal or conversation and, for a terminal, the
 * agent process registered for it does not exist (or was never registered). A Task of an unknown holder is never one.
 */
export function unfollowedTasks(facts: HolderFacts): string[] {
  return facts.tasks
    .filter((task) => {
      const holder = task.holder;
      if (!isKnownHolder(holder)) return false;
      if (facts.followedHere(holder) || facts.followedElsewhere.has(holder)) return false;
      return holder.startsWith("cursor:") || !facts.terminalProcessAlive(holder);
    })
    .map((task) => task.id);
}
