import * as vscode from "vscode";
import { closeSync, ftruncateSync, openSync, readFileSync, writeSync } from "node:fs";
import { join } from "node:path";
import { announcementsDir, listAnnouncements, quietAnnouncements, withdrawAll } from "../../../src/core/announcements";
import type { Announcement } from "../../../src/core/announcements";
import { TramaError } from "../../../src/core/errors";
import { draftChangedAt, getProposal, listProposals } from "../../../src/core/proposals";
import { announcementView } from "../../../src/core/snapshot";
import type { AnnouncementView } from "../../../src/core/snapshot";
import { projectAt } from "../../../src/core/store";
import type { Project } from "../../../src/core/store";
import type { CursorChatEvent } from "../../../src/core/cursor-chat";
import { onCursorChatEvent } from "./cursor";
import { questionRoundClosedAt, questionRoundOpen } from "./question-activity";
import { aliveSeenAt, readOnlySeenAt } from "./terminal-activity";

const CHECK_EVERY_MS = 30_000;

type Listener = (withdrawn: AnnouncementView[]) => void;
const listeners = new Set<Listener>();

/** The panel hears of every announcement withdrawn because the agent finished without delivering its card. */
export function onAnnouncementsWithdrawn(listener: Listener): { dispose(): void } {
  listeners.add(listener);
  return { dispose: () => void listeners.delete(listener) };
}

function describe(p: Project, withdrawn: Announcement[]): AnnouncementView[] {
  const titles = new Map(listProposals(p).map((proposal) => [proposal.id, proposal.title]));
  return withdrawn.map((a) => announcementView(a, a.proposal === null ? undefined : titles.get(a.proposal)));
}

function guarded(action: () => void): void {
  try {
    action();
  } catch (err) {
    if (err instanceof TramaError) void vscode.window.showErrorMessage(`Trama: announcements could not be withdrawn: ${err.message}`);
    else throw err;
  }
}

/**
 * The agent went quiet, the command Trama typed into an agent terminal ended or that terminal was closed, or a turn of
 * a Trama conversation in Cursor's chat was interrupted: the announcements still waiting are withdrawn at once and,
 * with `notify`, the panel is told, so the developer learns that the agent finished without delivering. With `which`
 * only the announcements it picks go; without it, every one.
 */
export function withdrawWaiting(root: string, which?: (a: Announcement) => boolean, notify = true): void {
  guarded(() => {
    const p = projectAt(root);
    const ids = which === undefined ? undefined : listAnnouncements(p).filter(which).map((a) => a.id);
    const views = describe(p, withdrawAll(p, ids));
    if (views.length === 0 || !notify) return;
    for (const listener of [...listeners]) listener(views);
  });
}

/**
 * The announcements of Cursor's chat agent belong to the project, not to a terminal: an interrupted or failed turn of a
 * Trama conversation withdraws them with the notice, closing one withdraws them silently (the developer chose to).
 */
function onCursorChat(event: CursorChatEvent): void {
  const fromChat = (a: Announcement) => a.chat !== null;
  if (event.event === "AGENT_INTERRUPTED") withdrawWaiting(event.root, fromChat);
  else if (event.event === "CONVERSATION_CLOSED") withdrawWaiting(event.root, fromChat, false);
}

function synchronizeTitles(p: Project, waiting: Announcement[]): void {
  for (const a of waiting) {
    if (a.kind !== "proposal" || a.proposal === null) continue;
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
 * are withdrawn with no notice. Then every half minute the quiet period is checked; changing a file of an announced
 * Draft restarts it, and it does not run while a question round is open and starts again when it closes.
 */
export function watchAnnouncements(root: () => string | undefined): vscode.Disposable {
  const startup = root();
  if (startup !== undefined) guarded(() => void withdrawAll(projectAt(startup)));
  const timer = setInterval(() => {
    const current = root();
    if (current === undefined) return;
    let quiet: string[] = [];
    guarded(() => {
      const p = projectAt(current);
      const waiting = listAnnouncements(p);
      synchronizeTitles(p, waiting);
      // A hooked agent's announcements follow the quiet period too: its heartbeat and its read-only commands count. A Draft's
      // change counts only for the announcement bound to that Draft, and a question round's close for all of them.
      if (!questionRoundOpen()) quiet = quietAnnouncements(waiting, Date.now(), questionRoundClosedAt(), (a) => Math.max(readOnlySeenAt(), a.terminal === null ? 0 : aliveSeenAt(a.terminal), a.proposal === null ? 0 : draftChangedAt(p, a.proposal))).map((a) => a.id);
    });
    if (quiet.length > 0) withdrawWaiting(current, (a) => quiet.includes(a.id));
  }, CHECK_EVERY_MS);
  const chat = onCursorChatEvent(onCursorChat);
  return new vscode.Disposable(() => (clearInterval(timer), chat.dispose()));
}
