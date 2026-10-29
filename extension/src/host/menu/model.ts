import { z } from "zod";
import { MENU_VIEWS, type MenuSituation, type MenuState, type MergeMenuState, type MenuViewName, type ToMenuHost, type ToMenuWebview } from "../../menu-protocol";
import type { ViewName } from "../../protocol";
import type { ThemeSetting } from "../../webview/theme";

/** What the side menu needs of the editor; `vscode` stays out of the logic. */
export interface MenuSurface {
  /** Posts a message to the webview, when there is one. */
  post(message: ToMenuWebview): void;
  /** Sets the badge of the icon (`WebviewView.badge`); undefined takes it off. */
  setBadge(badge: { value: number; tooltip: string } | undefined): void;
  /** The `trama.theme` setting. */
  theme(): ThemeSetting;
  /** No folder open, a folder that is no project (the one that counts for the panel), or a project. */
  situation(): MenuSituation;
  /** The numbers of the last picture of the project the window built; undefined when there is none or its files could not be read. */
  facts(): { decisions: number; tasksSinceScan: number; handoffs: number } | undefined;
  /** The view the panel shows, or undefined with the panel closed. */
  panelView(): ViewName | undefined;
  /** The entry of a view: the same as the command `Trama: Show <view>`. */
  show(view: MenuViewName): void;
  /** Scan System, as the Board's button launched it. */
  scan(): void;
  /** The editor's choice of a folder to open. */
  openFolder(): void;
  /** Merge of Solo mode as the menu shows it: the last state worked out, a read of what is known that starts no process; undefined with Solo mode off. */
  mergeState(): MergeMenuState | undefined;
  /** Whether Team is available in the project of the window (`rules#manager-mode`: Manager mode recorded and origin on GitHub, the origin the window keeps), starting no process: the Team view and its entry. */
  manager(): boolean;
  /** The press of Merge. */
  startMerge(): void;
  /** Open Merge Editor of the merge Trama started. */
  openMergeEditor(): void;
  /** Reconcile with Agent on the merge Trama started. */
  reconcileMerge(): void;
  /** Abort Merge of the merge Trama started. */
  abortMerge(): void;
}

const messages = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("ready") }),
  z.strictObject({ type: z.literal("show"), view: z.enum(MENU_VIEWS) }),
  z.strictObject({ type: z.literal("scan") }),
  z.strictObject({ type: z.literal("openFolder") }),
  z.strictObject({ type: z.literal("merge") }),
  z.strictObject({ type: z.literal("openMergeEditor") }),
  z.strictObject({ type: z.literal("reconcileMerge") }),
  z.strictObject({ type: z.literal("abortMerge") }),
]);

/** A message from the menu webview, or undefined when it does not fit the protocol: it is ignored. */
export function parseMenuMessage(raw: unknown): ToMenuHost | undefined {
  const parsed = messages.safeParse(raw);
  return parsed.success ? (parsed.data as ToMenuHost) : undefined;
}

/** The tooltip of the icon's badge: `N cards await a decision`, `1 card awaits a decision` for one. */
export const badgeTooltip = (decisions: number): string => (decisions === 1 ? "1 card awaits a decision" : `${decisions} cards await a decision`);

/** The badge of the icon: the cards that wait for a decision in a Trama project, nothing with zero or outside a project. */
export function menuBadge(state: Pick<MenuState, "situation" | "decisions">): { value: number; tooltip: string } | undefined {
  return state.situation === "project" && state.decisions > 0 ? { value: state.decisions, tooltip: badgeTooltip(state.decisions) } : undefined;
}

/**
 * The side menu of one window (`menu-laterale`): computes the state it shows from the files, the panel and the settings, sends it with the badge of the
 * icon, and carries out what the menu asks.
 */
export class MenuModel {
  /** The numbers of the last Snapshot that could be read: they stay when the files cannot be read for a moment. */
  private last = { decisions: 0, tasksSinceScan: 0, handoffs: 0 };
  /** The last full state computed (`state`): what a change of the panel's view or a new visibility sends again, with only `panelView` read again. */
  private current: MenuState | undefined;

  constructor(private readonly surface: MenuSurface) {}

  /** The state now, computed from the files: the Snapshot is read only inside a project. It becomes the last state. */
  state(): MenuState {
    const situation = this.surface.situation();
    if (situation === "project") this.last = this.surface.facts() ?? this.last;
    const facts = situation === "project" ? this.last : { decisions: 0, tasksSinceScan: 0, handoffs: 0 };
    const merge = situation === "project" ? this.surface.mergeState() : undefined;
    const manager = situation === "project" && this.surface.manager();
    const { handoffs, ...numbers } = facts;
    this.current = { situation, ...numbers, panelView: this.surface.panelView() ?? null, ...(merge === undefined ? {} : { merge }), ...(manager ? { manager: true as const } : {}), ...(manager && handoffs > 0 ? { handoffs } : {}) };
    return this.current;
  }

  /** Sends the last state again with the view the panel shows now, when it changed view or the menu became visible: it builds no Snapshot, reads no file and starts no process. The badge and the title stay those of the last state. */
  highlight(): void {
    if (this.current === undefined) {
      this.refresh();
      return;
    }
    this.current = { ...this.current, panelView: this.surface.panelView() ?? null };
    this.surface.post({ type: "menuState", ...this.current });
  }

  /** Computes the state from the files and sends it to the menu and the badge to the icon: after a change of the files, the folders, the settings or the Merge, and when the menu asks for it. */
  refresh(): void {
    const state = this.state();
    this.surface.setBadge(menuBadge(state));
    this.surface.post({ type: "menuState", ...state });
  }

  themeChanged(): void {
    this.surface.post({ type: "theme", setting: this.surface.theme() });
  }

  /** A message from the webview. */
  receive(raw: unknown): void {
    const message = parseMenuMessage(raw);
    if (message === undefined) return;
    switch (message.type) {
      case "ready":
        this.themeChanged();
        this.refresh();
        return;
      case "show":
        this.surface.show(message.view);
        return;
      case "scan":
        this.surface.scan();
        return;
      case "openFolder":
        this.surface.openFolder();
        return;
      case "merge":
        this.surface.startMerge();
        return;
      case "openMergeEditor":
        this.surface.openMergeEditor();
        return;
      case "reconcileMerge":
        this.surface.reconcileMerge();
        return;
      case "abortMerge":
        this.surface.abortMerge();
        return;
    }
  }
}
