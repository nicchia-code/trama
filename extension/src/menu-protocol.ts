import type { ViewName } from "./protocol";
import type { ThemeSetting } from "./webview/theme";

/** The views the panel shows, as its `viewChanged` messages name them. */
export const PANEL_VIEWS = ["getstarted", "diagram", "board", "requirements", "specs", "history", "settings"] as const satisfies readonly ViewName[];

/** The views the menu and the commands `Trama: Show <view>` name: the panel's. */
export type MenuViewName = ViewName;
export const MENU_VIEWS = PANEL_VIEWS;

/** The palette commands that do what the entries of the menu do, each with the view it shows (`Trama: Show <view>`). */
export const SHOW_COMMANDS = {
  "trama.showBoard": "board",
  "trama.showDiagram": "diagram",
  "trama.showRequirements": "requirements",
  "trama.showSpecs": "specs",
  "trama.showHistory": "history",
  "trama.showSettings": "settings",
} as const satisfies Record<string, MenuViewName>;

/** How the window stands for the menu: no folder open, a folder that is no Trama project (the one that counts for the panel), or a Trama project. */
export type MenuSituation = "noFolder" | "notProject" | "project";

/** Why Merge is unavailable, in the order the menu tells it. */
export type MergeReason = "inProgress" | "detached" | "changes" | "agent";

/** The line below the disabled `Merge` for each reason (`ui#solo-merge`); English, whatever `trama.language` says. */
export const MERGE_REASONS: Record<MergeReason, string> = {
  inProgress: "A merge is in progress.",
  detached: "Check out a branch to merge.",
  changes: "Commit or stash your changes to merge.",
  agent: "Wait for the agent to finish.",
};

/** Merge of Solo mode as the menu shows it (`tech#solo-merge`): `open` while a merge Trama started is in progress (`conflict`: its files still have conflicts). */
export interface MergeMenuState {
  available: boolean;
  reason?: MergeReason;
  /** Some of Trama's files are tracked by git. */
  trackedTrama: boolean;
  open?: { branch: string; conflict: boolean };
}

/** The state of the side menu, which the host sends again at every change (`menu-laterale`). */
export interface MenuState {
  situation: MenuSituation;
  /** The cards that wait for a decision (the number of the Board entry and of the badge of the icon). */
  decisions: number;
  /** The Tasks finished since the last scan of the whole System. */
  tasksSinceScan: number;
  /** The view the panel shows, or none when the panel is closed. */
  panelView: ViewName | null;
  /** Merge of Solo mode: absent with Solo mode off. */
  merge?: MergeMenuState;
}

/** Host -> menu webview. */
export type ToMenuWebview = ({ type: "menuState" } & MenuState) | { type: "theme"; setting: ThemeSetting };

/** Menu webview -> host: the only things the menu asks; the last four exist only with Solo mode on (`tech#solo-merge`). */
export type ToMenuHost =
  | { type: "ready" }
  /** The entry of a view: the host treats it as the command with the same name (`trama.show<View>`; Get Started is the ordinary opening). */
  | { type: "show"; view: MenuViewName }
  /** Scan System: launches the scan of the whole System without opening the panel. */
  | { type: "scan" }
  /** Open Folder: the editor's own folder picker. */
  | { type: "openFolder" }
  /** Merge: fetch, the choice of the branch and the merge, in the flow of Merge. */
  | { type: "merge" }
  /** Open Merge Editor: the first file with conflicts of the merge Trama started, in the editor's merge editor. */
  | { type: "openMergeEditor" }
  /** Reconcile with Agent: the agent resolves the conflicts of the merge Trama started. */
  | { type: "reconcileMerge" }
  /** Abort Merge: `git merge --abort` after the developer's confirmation. */
  | { type: "abortMerge" };
