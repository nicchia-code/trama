import type { BoardCounts } from "./board-counts";
import type { CommandOutcome } from "./notice-text";
import type { Notice, NoticeService } from "./notices";

/** How the terminal reported the end of the command: no status at all, success, or a failing status. */
export function commandOutcome(exitCode: number | undefined): CommandOutcome {
  if (exitCode === undefined) return { kind: "unreported" };
  return exitCode === 0 ? { kind: "finished" } : { kind: "failed", exitCode };
}

/**
 * The notices on the end of the command Trama typed into an agent's terminal that still wait for their ten seconds, of
 * every terminal. What they say about the Board is read when they leave, not when the command ended.
 */
export class EndNotices {
  private readonly waiting = new Set<Notice>();

  constructor(private readonly notices: NoticeService) {}

  /**
   * The command Trama typed ended: a notice is born if a topic is set right now. `board` is asked when the notice
   * leaves and returns nothing when the Board cannot be read.
   */
  born(project: string, outcome: CommandOutcome, board: () => BoardCounts | undefined): void {
    const notice: Notice | undefined = this.notices.start(() => {
      if (notice !== undefined) this.waiting.delete(notice);
      const counts = board();
      return counts === undefined ? undefined : { kind: "end", project, outcome, ...counts };
    });
    if (notice !== undefined) this.waiting.add(notice);
  }

  /** The developer put the agent back to work: no notice that still waits is needed. */
  cancelAll(): void {
    for (const notice of this.waiting) notice.cancel();
    this.waiting.clear();
  }
}
