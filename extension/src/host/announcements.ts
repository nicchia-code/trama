import * as vscode from "vscode";
import { listAnnouncements, retitleBoundAnnouncement, withdrawAllAsync } from "../../../src/core/announcements";
import type { Announcement } from "../../../src/core/announcements";
import { TramaError } from "../../../src/core/errors";
import { getProposal, listProposals } from "../../../src/core/proposals";
import { announcementView } from "../../../src/core/snapshot";
import type { AnnouncementView } from "../../../src/core/snapshot";
import { projectAt } from "../../../src/core/store";
import type { Project } from "../../../src/core/store";
import { unfollowedAnnouncements } from "../../../src/core/task-holders";
import { followFacts } from "./follow-facts";

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

async function guarded(action: () => Promise<void>, failure = "announcements could not be withdrawn"): Promise<void> {
  try {
    await action();
  } catch (err) {
    if (err instanceof TramaError) void vscode.window.showErrorMessage(`Trama: ${failure}: ${err.message}`);
    else throw err;
  }
}

/**
 * The agent terminal's idle hook, the command Trama typed into it ending, or the terminal closing withdraws its waiting
 * announcements. Elapsed time never withdraws one. The wait for the announcements' lock gives the thread back.
 * The panel is told when `notify` is true, so the developer learns that the agent finished without delivering. `which`
 * selects only matching announcements; without it, all waiting announcements are withdrawn.
 */
export function withdrawWaiting(root: string, which?: (a: Announcement) => boolean, notify = true): Promise<void> {
  return guarded(async () => {
    const p = projectAt(root);
    const ids = which === undefined ? undefined : listAnnouncements(p).filter(which).map((a) => a.id);
    const withdrawn = await withdrawAllAsync(p, ids);
    // An import ends with its agent and gives no notice: only a card the agent did not deliver, or a check it did not finish, is reported.
    const views = describe(p, withdrawn.filter((a) => a.kind !== "work"));
    if (views.length === 0 || !notify) return;
    for (const listener of [...listeners]) listener(views);
  });
}

/** The ghosts whose title is not their Draft's now: the announcement, its Draft's identity and the Draft's title. Reads only. */
function staleTitles(p: Project): { id: string; proposal: string; title: string }[] {
  const stale: { id: string; proposal: string; title: string }[] = [];
  for (const a of listAnnouncements(p)) {
    // A Resolve Drifts announcement keeps its title: it is named by its Drifts, not by a Draft. A Drift's ghost keeps the Drift's title.
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
    if (title !== a.title) stale.push({ id: a.id, proposal: a.proposal, title });
  }
  return stale;
}

/**
 * Gives the ghost of a Draft the Draft's current title. The title is written by the core under the announcements lock,
 * through a temporary file renamed over the announcement, and only while the file still exists: a ghost delivered or
 * withdrawn is never brought back, and nothing is written when the title already matches. `read` runs the reads that find the
 * titles to change (a picture's reads, which take the files from the window's cache); the writes read the announcement from the disk.
 */
export function synchronizeAnnouncementTitles(p: Project, read: <T>(fn: () => T) => T = (fn) => fn()): void {
  for (const { id, proposal, title } of read(() => staleTitles(p))) {
    try {
      retitleBoundAnnouncement(p, id, proposal, title);
    } catch (err) {
      throw new TramaError(`Could not synchronize announcement ${id}: ${(err as Error).message}`);
    }
  }
}

/**
 * The announcements left on disk that are orphans (`rules#announcement`): those of no terminal, and those of a terminal or
 * omp Chat conversation that no window follows (this one, with the conversations it will resume and its General, or another
 * open window of the project) and whose recorded process is gone, recognised by pid and start time. They are withdrawn with
 * the notice of an announcement not delivered, none for a work. What a live agent keeps alive stays, with its ghost: a
 * second window on the project never withdraws what the first follows. An unreadable registry withdraws nothing of a holder.
 */
export async function withdrawOrphans(root: string): Promise<void> {
  let gone: Set<string>;
  try {
    const owned = listAnnouncements(projectAt(root)).map((a) => ({ id: a.id, terminal: a.terminal }));
    if (owned.length === 0) return;
    const facts = await followFacts(root, owned.map((a) => a.terminal));
    gone = new Set(unfollowedAnnouncements({ announcements: owned, ...facts }));
  } catch (err) {
    if (err instanceof TramaError) void vscode.window.showErrorMessage(`Trama: announcements could not be checked: ${err.message}`);
    else throw err;
    return;
  }
  if (gone.size > 0) await withdrawWaiting(root, (announcement) => gone.has(announcement.id));
}

/**
 * Opening or reloading the window withdraws only the orphan announcements (`withdrawOrphans`). It runs once the caller says
 * the window has read the conversations it will resume and its General (`conversationsRead`, which the window's own
 * `followsHolder` then counts); without it at once. The Tasks an agent had taken stay taken until that agent ends, or the
 * developer takes them back. Draft title synchronization runs from the panel's existing snapshot refresh path.
 * `done` settles when the withdrawal has finished, so the first execution check can follow it.
 */
export function watchAnnouncements(root: () => string | undefined, conversationsRead: Promise<void> = Promise.resolve()): vscode.Disposable & { done: Promise<void> } {
  const startup = root();
  let disposed = false;
  const done =
    startup === undefined
      ? Promise.resolve()
      : conversationsRead.then(() => (disposed ? undefined : withdrawOrphans(startup))).catch(() => undefined);
  return { dispose: () => void (disposed = true), done };
}
