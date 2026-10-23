import * as vscode from "vscode";
import { listAnnouncements } from "../../../src/core/announcements";
import { announcementView } from "../../../src/core/snapshot";
import { projectAt } from "../../../src/core/store";
import { type Activity, ACTIVITIES_ITEM_ID, ACTIVITIES_ITEM_NAME, ACTIVITIES_PLACEHOLDER, ACTIVITIES_PRIORITY, ACTIVITIES_REFRESH_MS, activitiesOf, activityOptions, SHOW_ACTIVITIES_COMMAND, summarize } from "./activities";

/** The command the item's click runs; it is not in the command palette. */
export { SHOW_ACTIVITIES_COMMAND };

type OptionItem = vscode.QuickPickItem & { id: string };

/**
 * The status bar item that sums up the ghosts with no Board column (checks, scans, comparisons, works), in every window open
 * on a Trama project, also with the panel closed. It follows the announcements of the project through `files` (the watcher
 * of `.trama/**`), shows only while one exists, and recomputes `Running for` every 30 seconds while it shows. Its click, with
 * one ghost, opens that ghost's details through `openDetails`; with several, a QuickPick that follows the announcements.
 */
export class ActivitiesItem implements vscode.Disposable {
  private readonly item = vscode.window.createStatusBarItem(ACTIVITIES_ITEM_ID, vscode.StatusBarAlignment.Left, ACTIVITIES_PRIORITY);
  private readonly subscriptions: vscode.Disposable[] = [];
  private activities: Activity[] = [];
  private timer: NodeJS.Timeout | undefined;
  private pick: vscode.QuickPick<OptionItem> | undefined;

  constructor(
    private readonly root: () => string | undefined,
    files: vscode.FileSystemWatcher,
    private readonly openDetails: (announcement: string) => void,
  ) {
    this.item.name = ACTIVITIES_ITEM_NAME;
    this.item.command = SHOW_ACTIVITIES_COMMAND;
    const refresh = (): void => this.refresh();
    this.subscriptions.push(
      files.onDidCreate(refresh),
      files.onDidChange(refresh),
      files.onDidDelete(refresh),
      vscode.workspace.onDidChangeWorkspaceFolders(refresh),
    );
    this.refresh();
  }

  /** Reads the announcements again and brings the item, and the list when it is open, up to date. */
  refresh(): void {
    this.activities = this.read();
    const [first] = this.activities;
    if (first === undefined) {
      this.item.hide();
      this.stopTimer();
      this.pick?.hide();
      return;
    }
    const { text, tooltip, label } = summarize(this.activities);
    this.item.text = text;
    this.item.tooltip = tooltip;
    this.item.accessibilityInformation = { label };
    this.item.show();
    this.timer ??= setInterval(() => this.refresh(), ACTIVITIES_REFRESH_MS);
    this.timer.unref?.();
    this.updatePick();
  }

  /** The click: the details of the only ghost, or the list of all of them. */
  show(): void {
    const [only, ...others] = this.activities;
    if (only === undefined) return;
    if (others.length === 0) this.openDetails(only.id);
    else this.openList();
  }

  private read(): Activity[] {
    const root = this.root();
    if (root === undefined) return [];
    try {
      const project = projectAt(root);
      return activitiesOf(listAnnouncements(project).map((a) => announcementView(project, a, undefined)));
    } catch {
      // An unreadable announcement folder shows nothing; the next change of the files tries again.
      return [];
    }
  }

  private options(): OptionItem[] {
    return activityOptions(this.activities);
  }

  private openList(): void {
    if (this.pick !== undefined) return;
    const pick = vscode.window.createQuickPick<OptionItem>();
    this.pick = pick;
    pick.placeholder = ACTIVITIES_PLACEHOLDER;
    pick.items = this.options();
    pick.onDidAccept(() => {
      const [chosen] = pick.selectedItems;
      pick.hide();
      if (chosen !== undefined) this.openDetails(chosen.id);
    });
    pick.onDidHide(() => {
      if (this.pick === pick) this.pick = undefined;
      pick.dispose();
    });
    pick.show();
  }

  private updatePick(): void {
    const pick = this.pick;
    if (pick === undefined) return;
    const active = pick.activeItems[0]?.id;
    const items = this.options();
    pick.items = items;
    const kept = items.find((option) => option.id === active);
    if (kept !== undefined) pick.activeItems = [kept];
  }

  private stopTimer(): void {
    clearInterval(this.timer);
    this.timer = undefined;
  }

  dispose(): void {
    this.stopTimer();
    this.pick?.dispose();
    this.pick = undefined;
    this.subscriptions.forEach((s) => s.dispose());
    this.item.dispose();
  }
}
