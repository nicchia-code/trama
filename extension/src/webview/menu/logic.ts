// Pure logic of the side menu: no DOM. The names and order of its entries.
import { MERGE_REASONS, type MergeMenuState, type MenuViewName } from "../../menu-protocol";
import { VIEW_LABELS } from "../../view-labels";

/** The text of the entry of each view: the names the editor tab of the panel carries too. */
export const ENTRY_LABELS: Record<MenuViewName, string> = VIEW_LABELS;

/** The entries of a Trama project, from the top; Scan System and Settings stand together at the foot, Settings last. */
export const PROJECT_ENTRIES = ["board", "diagram", "requirements", "specs", "history"] as const satisfies readonly MenuViewName[];

/** The accessible name of an entry: its text, and for Board the number of cards awaiting a decision when there are some. */
export function entryName(view: MenuViewName, decisions: number): string {
  return view === "board" && decisions > 0 ? `Board, ${decisions} awaiting a decision` : ENTRY_LABELS[view];
}

/** The warning line of Merge while some of Trama's files are tracked by git (`ui#solo-merge`). */
export const TRACKED_TRAMA_LINE = "Some Trama files are tracked by git: their changes enter your commits.";

/** The lines below `Merge`, in order: while a merge Trama started is open, where it stands; otherwise the first reason it is unavailable; then, in the warning colour, the tracked files of Trama. */
export function mergeLines(merge: MergeMenuState): { text: string; warning: boolean }[] {
  const first = merge.open !== undefined ? `Merging ${merge.open.branch}: resolve the conflicts, then commit.` : merge.reason !== undefined ? MERGE_REASONS[merge.reason] : undefined;
  return [...(first === undefined ? [] : [{ text: first, warning: false }]), ...(merge.trackedTrama ? [{ text: TRACKED_TRAMA_LINE, warning: true }] : [])];
}

/** The accessible name of `Merge`: its text, followed by the lines below it when there are some. */
export function mergeName(merge: MergeMenuState): string {
  const lines = mergeLines(merge);
  return lines.length === 0 ? "Merge" : `Merge. ${lines.map((line) => line.text).join(" ")}`;
}
