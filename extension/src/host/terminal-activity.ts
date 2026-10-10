import type { AgentOrigin } from "../../../src/core/announcements";

// The agents' activity the editor saw, for the quiet periods of announcements and of taken Tasks. Kept in memory only:
// nothing is written to disk and no `touched` changes.

const aliveAt = new Map<string, number>();
const commandAt = new Map<string, number>();
let readOnlyAt = 0;

/** A command of an agent reached the editor: a read-only one counts for every announcement, any one for its terminal. */
export function noteCommandSeen(origin: AgentOrigin, readOnly: boolean, now = Date.now()): void {
  if (readOnly) readOnlyAt = now;
  if (origin.terminal !== undefined) commandAt.set(origin.terminal, now);
}

/** The hook of the agent in `terminal` said it is still working. */
export function noteAliveSeen(terminal: string, now = Date.now()): void {
  aliveAt.set(terminal, now);
}

/** The last read-only command of an agent: it counts for every announcement. */
export const readOnlySeenAt = (): number => readOnlyAt;

/** The last heartbeat of the agent in `terminal`: it counts for that terminal's announcements only. */
export const aliveSeenAt = (terminal: string): number => aliveAt.get(terminal) ?? 0;

/** The last sign of life of the agent in `terminal`: its heartbeat or any command it ran. */
export const terminalSeenAt = (terminal: string): number => Math.max(aliveSeenAt(terminal), commandAt.get(terminal) ?? 0);
