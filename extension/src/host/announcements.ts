import * as vscode from "vscode";
import { closeSync, ftruncateSync, openSync, readFileSync, writeSync } from "node:fs";
import { join } from "node:path";
import { announcementsDir, listAnnouncements, withdrawAll } from "../../../src/core/announcements";
import type { Announcement } from "../../../src/core/announcements";
import { TramaError } from "../../../src/core/errors";
import { getProposal, listProposals } from "../../../src/core/proposals";
import { announcementView } from "../../../src/core/snapshot";
import type { AnnouncementView } from "../../../src/core/snapshot";
import { projectAt } from "../../../src/core/store";
import type { Project } from "../../../src/core/store";
import type { CursorChatEvent } from "../../../src/core/cursor-chat";
import { onCursorChatEvent } from "./cursor";

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
    // An import ends with its agent and gives no notice: only a card the agent did not deliver, or a check it did not finish, is reported.
    const views = describe(p, withdrawn.filter((a) => a.kind !== "work"));
    if (views.length === 0 || !notify) return;
    for (const listener of [...listeners]) listener(views);
  });
}

/**
 * A conversation ending withdraws the chat announcements it owns, and those of the project's chat that name no
 * conversation; another conversation's announcements stay. A stopped or interrupted turn gives the usual notice, while
 * closing the conversation is silent. Events that do not end a turn (such as a final Advisor review) withdraw nothing.
 */
function onCursorChat(event: CursorChatEvent): void {
  const ofConversation = (a: Announcement) => a.chat !== null && (a.conversation === null || a.conversation === event.conversation);
  if (event.event === "AGENT_STOPPED" || event.event === "AGENT_INTERRUPTED") withdrawWaiting(event.root, ofConversation);
  else if (event.event === "CONVERSATION_CLOSED") withdrawWaiting(event.root, ofConversation, false);
}

/**
 * The execution check closed a Cursor chat job (`time.CHECK_DUE`). A job bound to its conversation withdraws that
 * conversation's announcements and the project chat's, with the usual notice. A job never bound to a conversation never
 * started: only the announcement Trama made at its launch goes, silently; announcements others made in the project's
 * chat stay. Terminals need nothing here: their abnormal end already withdraws their announcements.
 */
export function withdrawForCheck(root: string, job: { announcement?: string; conversation?: string }): void {
  const { announcement, conversation } = job;
  if (conversation === undefined) {
    if (announcement !== undefined) withdrawWaiting(root, (a) => a.id === announcement, false);
    return;
  }
  withdrawWaiting(root, (a) => a.chat !== null && (a.conversation === null || a.conversation === conversation));
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
 * are withdrawn with no notice. The Tasks an agent had taken stay taken until that agent ends or the developer takes
 * them back. Draft title synchronization runs from the panel's existing snapshot refresh path.
 */
export function watchAnnouncements(root: () => string | undefined): vscode.Disposable {
  const startup = root();
  if (startup !== undefined) {
    guarded(() => {
      const p = projectAt(startup);
      withdrawAll(p);
    });
  }
  return onCursorChatEvent(onCursorChat);
}
