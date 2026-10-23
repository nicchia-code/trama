// Pure logic of the side menu: no DOM. The names, tooltips and order of its entries.
import type { MenuViewName } from "../../menu-protocol";

/** The text of the entry of each view. */
export const ENTRY_LABELS: Record<MenuViewName, string> = {
  board: "Board",
  diagram: "Diagram",
  requirements: "Requirements",
  specs: "Specs",
  history: "History",
  settings: "Settings",
  getstarted: "Get Started",
};

/** The entries of a Trama project from the top, above Scan System; Settings stands alone at the bottom. */
export const PROJECT_ENTRIES = ["board", "diagram", "requirements", "specs", "history"] as const satisfies readonly MenuViewName[];

/** The tooltip of an entry. */
export const entryTooltip = (view: MenuViewName): string => `Open ${ENTRY_LABELS[view]} in the Trama panel`;

/** The accessible name of an entry: its text, and for Board the number of cards awaiting a decision when there are some. */
export function entryName(view: MenuViewName, decisions: number): string {
  return view === "board" && decisions > 0 ? `Board, ${decisions} awaiting a decision` : ENTRY_LABELS[view];
}
