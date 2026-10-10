import type { AgentOrigin } from "../../../src/core/announcements";

// The agent's command activity the editor saw, kept in memory for running Tasks.

const commandAt = new Map<string, number>();

export function noteCommandSeen(origin: AgentOrigin, now = Date.now()): void {
  if (origin.terminal !== undefined) commandAt.set(origin.terminal, now);
}


/** The last command of the agent in `terminal`. */
export const terminalSeenAt = (terminal: string): number => commandAt.get(terminal) ?? 0;
