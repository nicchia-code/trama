import * as vscode from "vscode";
import { type Announcement, isQuiet, listAnnouncements, withdrawAll } from "../../../src/core/announcements";
import { TramaError } from "../../../src/core/errors";
import { listProposals } from "../../../src/core/proposals";
import { type AnnouncementView, announcementView } from "../../../src/core/snapshot";
import { projectAt, type Project } from "../../../src/core/store";
import type { CursorChatEvent } from "../../../src/core/cursor-chat";
import { onCursorChatEvent } from "./cursor";
import { questionRoundClosedAt, questionRoundOpen } from "./question-activity";

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

/**
 * Starting up, announcements left on disk belong to an agent run that can no longer be told: they are withdrawn with
 * no notice. Then every half minute the quiet period is checked; it does not run while a question round is open and
 * starts again when it closes.
 */
export function watchAnnouncements(root: () => string | undefined): vscode.Disposable {
  const startup = root();
  if (startup !== undefined) guarded(() => void withdrawAll(projectAt(startup)));
  const timer = setInterval(() => {
    const current = root();
    if (current === undefined || questionRoundOpen()) return;
    let quiet = false;
    guarded(() => {
      quiet = isQuiet(listAnnouncements(projectAt(current)), Date.now(), questionRoundClosedAt());
    });
    if (quiet) withdrawWaiting(current);
  }, CHECK_EVERY_MS);
  const chat = onCursorChatEvent(onCursorChat);
  return new vscode.Disposable(() => (clearInterval(timer), chat.dispose()));
}
