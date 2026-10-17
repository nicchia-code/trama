import * as vscode from "vscode";
import { closeSync, ftruncateSync, openSync, readFileSync, writeSync } from "node:fs";
import { join } from "node:path";
import { announcementsDir, listAnnouncements, withdrawAll } from "../../../src/core/announcements";
import type { Announcement } from "../../../src/core/announcements";
import { TramaError } from "../../../src/core/errors";
import { getProposal, listProposals } from "../../../src/core/proposals";
import { releaseAbandonedTasks } from "../../../src/core/work";
import { sendCoordinatorMessage } from "../../../src/core/question-channel";
import { announcementView } from "../../../src/core/snapshot";
import type { AnnouncementView } from "../../../src/core/snapshot";
import { projectAt } from "../../../src/core/store";
import type { Project } from "../../../src/core/store";
import type { CursorChatEvent } from "../../../src/core/cursor-chat";
import type { CopilotChatEvent } from "./copilot-chat";
import { onCursorChatEvent } from "./cursor";
import { onCopilotChatEvent } from "./copilot-chat";

type Listener = (withdrawn: AnnouncementView[]) => void;
const listeners = new Set<Listener>();

/** The panel hears of every announcement withdrawn because the agent finished without delivering its card. */
export function onAnnouncementsWithdrawn(listener: Listener): { dispose(): void } {
  listeners.add(listener);
  return { dispose: () => void listeners.delete(listener) };
}

function describe(p: Project, withdrawn: Announcement[]): AnnouncementView[] {
  const titles = new Map(listProposals(p).map((proposal) => [proposal.id, proposal.title]));
  return withdrawn.map((a) => announcementView(p, a, a.proposal === null ? undefined : titles.get(a.proposal)));
}

function guarded(action: () => void, failure = "announcements could not be withdrawn"): void {
  try {
    action();
  } catch (err) {
    if (err instanceof TramaError) void vscode.window.showErrorMessage(`Trama: ${failure}: ${err.message}`);
    else throw err;
  }
}

/**
 * The agent terminal's idle hook, the command Trama typed into it ending, or the terminal closing withdraws its waiting
 * announcements. Applicable Cursor chat events do the same for chat announcements; elapsed time never withdraws one.
 * The panel is told when `notify` is true, so the developer learns that the agent finished without delivering. `which`
 * selects only matching announcements; without it, all waiting announcements are withdrawn.
 */
export function withdrawWaiting(root: string, which?: (a: Announcement) => boolean, notify = true): void {
  guarded(() => {
    const p = projectAt(root);
    const ids = which === undefined ? undefined : listAnnouncements(p).filter(which).map((a) => a.id);
    const withdrawn = withdrawAll(p, ids);
    for (const a of withdrawn) if (a.kind === "check" && a.phase === "scanning" && a.job !== null) {
      // The coordinator counts it only if it knows this job as a Run, so a window that followed another window's Run forwards it too.
      sendCoordinatorMessage(p, { type: "interrupted-preflight", root, job: a.job, title: a.title }).catch(() => undefined);
    }
    // An import ends with its agent and gives no notice: only a card the agent did not deliver, or a check it did not finish, is reported.
    const views = describe(p, withdrawn.filter((a) => a.kind !== "work"));
    if (views.length === 0 || !notify) return;
    for (const listener of [...listeners]) listener(views);
  });
}

/**
 * A conversation ending withdraws the project's chat announcements: a stopped or interrupted turn gives the usual
 * notice, while closing the conversation is silent.
 */
function onCursorChat(event: CursorChatEvent): void {
  const fromChat = (a: Announcement) => a.chat !== null;
  if (event.event === "AGENT_STOPPED" || event.event === "AGENT_INTERRUPTED") withdrawWaiting(event.root, fromChat);
  else if (event.event === "CONVERSATION_CLOSED") withdrawWaiting(event.root, fromChat, false);
}

function onCopilotChat(event: CopilotChatEvent): void {
  if (event.event === "AGENT_STOPPED") withdrawWaiting(event.root, (a) => a.chat !== null);
}

export function synchronizeAnnouncementTitles(p: Project): void {
  const waiting = listAnnouncements(p);
  for (const a of waiting) {
    // A Resolve Drifts announcement keeps its title: it is named by its Drifts, not by a Draft.
    if (a.kind !== "proposal" || a.proposal === null || a.drifts.length > 0) continue;
    let title: string;
    try {
      const draft = getProposal(p, a.proposal);
      if (draft.data.status !== "draft") continue;
      title = draft.title;
    } catch {
      // An unreadable Draft leaves its announcement unchanged.
      continue;
    }
    if (title === a.title) continue;
    let fd: number;
    try {
      // Opening an existing file cannot recreate a delivered or withdrawn announcement.
      fd = openSync(join(announcementsDir(p), `${a.id}.md`), "r+");
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") continue;
      throw new TramaError(`Could not synchronize announcement ${a.id}: ${(err as Error).message}`);
    }
    try {
      const text = readFileSync(fd, "utf8");
      const updated = text.replace(/^#\s+(.+)$/m, () => `# ${title}`);
      if (text === updated) continue;
      const bytes = Buffer.from(updated);
      let offset = 0;
      while (offset < bytes.length) offset += writeSync(fd, bytes, offset, bytes.length - offset, offset);
      ftruncateSync(fd, bytes.length);
    } finally {
      closeSync(fd);
    }
  }
}

/**
 * Starting up, announcements left on disk in the open folder belong to an agent run that can no longer be told: they
 * are withdrawn with no notice, and the Tasks an agent had taken are released the same way, since no agent is followed
 * yet. Draft title synchronization runs from the panel's existing snapshot refresh path.
 */
export function watchAnnouncements(root: () => string | undefined): vscode.Disposable {
  const startup = root();
  if (startup !== undefined) {
    guarded(() => {
      const p = projectAt(startup);
      withdrawAll(p);
    });
    guarded(() => {
      releaseAbandonedTasks(projectAt(startup));
    }, "the Tasks an agent had taken could not be released");
  }
  const cursor = onCursorChatEvent(onCursorChat);
  const copilot = onCopilotChatEvent(onCopilotChat);
  return new vscode.Disposable(() => (cursor.dispose(), copilot.dispose()));
}
