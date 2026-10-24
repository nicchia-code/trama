/** A Task taken by the agent, as the execution check sees it: its identity and who holds it (`agent` of the Task file). */
export interface TakenTask {
  id: string;
  holder: string | null;
}

/** An announcement, as the execution check sees it: its identity and the terminal (or omp Chat conversation) it belongs to, null for one that belongs to none. */
export interface OwnedAnnouncement {
  id: string;
  terminal: string | null;
}

/** What the check has gathered about who follows the holders it looks at. */
export interface FollowFacts {
  /** Whether this window itself follows the holder (a terminal in Agent running, an omp Chat conversation, its General). */
  followedHere: (holder: string) => boolean;
  /** The holders another live window of the project says it follows; a window that did not answer in time follows nothing. */
  followedElsewhere: ReadonlySet<string>;
  /** Whether the agent process registered for the holder is still the one registered (`sameProcess`): false when none is registered, it cannot be recognised or it is not the same. */
  terminalProcessAlive: (terminal: string) => boolean;
}

export interface HolderFacts extends FollowFacts {
  tasks: TakenTask[];
}

export interface AnnouncementFacts extends FollowFacts {
  announcements: OwnedAnnouncement[];
}

/** The holder of a Task Trama can tell: the identity of a Trama terminal or conversation. `null` (a Task nobody holds) names nobody. */
export const isKnownHolder = (holder: string | null): holder is string => holder !== null;

/** The distinct holders the check has to ask the other windows about: those of `holders` that exist and this window does not follow. */
export function holdersToAsk(holders: readonly (string | null)[], followedHere: (holder: string) => boolean): string[] {
  return [...new Set(holders.filter(isKnownHolder).filter((holder) => !followedHere(holder)))];
}

/** Nobody follows `holder`: no window, this one or another, and the process registered for it is not alive. */
const nobodyFollows = (holder: string, facts: FollowFacts): boolean => !facts.followedHere(holder) && !facts.followedElsewhere.has(holder) && !facts.terminalProcessAlive(holder);

/**
 * The taken Tasks nobody follows any more: no window follows their terminal (or the omp Chat conversation that is its
 * identity) and the agent process registered for it is not alive, was never registered or is not the same process any
 * more. A Task of no holder is never one.
 */
export function unfollowedTasks(facts: HolderFacts): string[] {
  return facts.tasks.filter((task) => isKnownHolder(task.holder) && nobodyFollows(task.holder, facts)).map((task) => task.id);
}

/**
 * The announcements nobody follows any more, on the same terms as `unfollowedTasks`; one that belongs to no terminal has
 * nobody to follow it and no registered process.
 */
export function unfollowedAnnouncements(facts: AnnouncementFacts): string[] {
  return facts.announcements.filter((a) => a.terminal === null || nobodyFollows(a.terminal, facts)).map((a) => a.id);
}

/** The holders (terminals or omp Chat conversations) nobody follows any more, on the same terms as `unfollowedTasks`: what the check forgets of them, such as their claims. */
export function unfollowedHolders(holders: readonly string[], facts: FollowFacts): string[] {
  return holders.filter((holder) => nobodyFollows(holder, facts));
}
