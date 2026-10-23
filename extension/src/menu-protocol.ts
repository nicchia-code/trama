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

/** The state of the side menu, which the host sends again at every change (`menu-laterale`). */
export interface MenuState {
  situation: MenuSituation;
  /** The cards that wait for a decision (the number of the Board entry and of the badge of the icon). */
  decisions: number;
  /** The Tasks finished since the last scan of the whole System. */
  tasksSinceScan: number;
  /** The Advisor Scanner is on: Scan System stays in its place, disabled. */
  advisorScanner: boolean;
  /** The view the panel shows, or none when the panel is closed. */
  panelView: ViewName | null;
}

/** Host -> menu webview. */
export type ToMenuWebview = ({ type: "menuState" } & MenuState) | { type: "theme"; setting: ThemeSetting };

/** Menu webview -> host: the only three things the menu asks. */
export type ToMenuHost =
  | { type: "ready" }
  /** The entry of a view: the host treats it as the command with the same name (`trama.show<View>`; Get Started is the ordinary opening). */
  | { type: "show"; view: MenuViewName }
  /** Scan System: launches the scan of the whole System without opening the panel. */
  | { type: "scan" }
  /** Open Folder: the editor's own folder picker. */
  | { type: "openFolder" };
