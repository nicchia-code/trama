/** The facts the execution check gathers about one agent terminal of Trama in Agent running. */
export interface TerminalFacts {
  /** The editor no longer lists the terminal, or reports its exit status, and Trama has not seen it close. */
  terminalGone: boolean;
  /** The process the hook reported (`agent-hook.STARTED`), if any. */
  hookPid?: number;
  /** The shell process of the terminal, read once, when the hook reported none. */
  shellPid?: number;
}

/** Why Trama stops following a terminal; the texts are the Board notice's reasons. */
export type TerminalGone = "the terminal is gone" | "the agent's process is gone";

/**
 * Decides, from certain facts only, whether the agent of a terminal is gone. A vanished terminal wins; otherwise the
 * process the hook reported, or, without it, the shell's. When no process is known the answer is "not gone": a doubt leaves everything as it is.
 */
export function terminalVerdict(facts: TerminalFacts, alive: (pid: number) => boolean): TerminalGone | undefined {
  if (facts.terminalGone) return "the terminal is gone";
  const pid = facts.hookPid ?? facts.shellPid;
  if (pid === undefined) return undefined;
  return alive(pid) ? undefined : "the agent's process is gone";
}
