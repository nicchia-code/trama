import { isHooked } from "./drift-resolution";

/** Something of this window that follows holders: its terminals in Agent running, its omp Chat conversations, its General. */
type Follower = (holder: string) => boolean;

const followers = new Set<Follower>();

/** Adds a follower: the window follows every holder it says yes to. Returns what removes it. */
export function addHolderFollower(follower: Follower): { dispose(): void } {
  followers.add(follower);
  return { dispose: () => void followers.delete(follower) };
}

/**
 * Whether this window follows `holder`, a terminal of Trama or the omp Chat conversation that is its identity: a terminal in
 * Agent running, an omp Chat conversation (also one it is about to resume) or its General. It is what the window answers to
 * `followed-holders` and what its own execution check leaves alone.
 */
export function followsHolder(holder: string): boolean {
  return isHooked(holder) || [...followers].some((follows) => follows(holder));
}
