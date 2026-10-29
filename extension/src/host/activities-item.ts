import { timerWork } from "./performance";
import * as vscode from "vscode";
import type { AnnouncementView } from "../../../src/core/snapshot";
import { type Activity, ACTIVITIES_ITEM_ID, ACTIVITIES_ITEM_NAME, ACTIVITIES_PLACEHOLDER, ACTIVITIES_PRIORITY, ACTIVITIES_REFRESH_MS, activitiesOf, activityOptions, SHOW_ACTIVITIES_COMMAND, summarize } from "./activities";
import type { PictureOutcome, WindowPicture } from "./picture";

/** The command the item's click runs; it is not in the command palette. */
export { SHOW_ACTIVITIES_COMMAND };

type OptionItem = vscode.QuickPickItem & { id: string };

/**
 * The status bar item that sums up the ghosts with no Board column (checks, scans, comparisons, works), in every window open
 * on a Trama project, also with the panel closed. It takes the announcements from the picture the window builds on the watcher of
 * `.trama/**` (the same view of the ghosts as the Snapshot), at every new picture, and never reads the announcements folder itself. It shows only while one exists,
 * and recomputes `Running for` every 30 seconds while it shows, from what it already holds. Its click, with one ghost, opens that
 * ghost's details through `openDetails`; with several, a QuickPick that follows the announcements.
 */
export class ActivitiesItem implements vscode.Disposable {
  private readonly item = vscode.window.createStatusBarItem(ACTIVITIES_ITEM_ID, vscode.StatusBarAlignment.Left, ACTIVITIES_PRIORITY);
  private readonly subscriptions: { dispose(): void }[] = [];
  /** The ghosts of the last picture that built. */
  private announcements: readonly AnnouncementView[] = [];
  private activities: Activity[] = [];
  private timer: NodeJS.Timeout | undefined;
  private pick: vscode.QuickPick<OptionItem> | undefined;

  constructor(
    picture: WindowPicture,
    private readonly openDetails: (announcement: string) => void,
  ) {
    this.item.name = ACTIVITIES_ITEM_NAME;
    this.item.command = SHOW_ACTIVITIES_COMMAND;
    this.subscriptions.push(picture.onDidBuild((outcome) => this.follow(outcome)));
    const built = picture.peek();
    if (built !== undefined) this.follow(built);
  }

  /** A new picture: its ghosts, or none when the window has no project; a picture that could not be read leaves the item as it is. */
  private follow(outcome: PictureOutcome): void {
    if (outcome.kind === "failed") return;
    this.announcements = outcome.kind === "none" ? [] : outcome.snapshot.announcements;
    this.refresh();
  }

  /** Brings the item, and the list when it is open, up to date with the ghosts it holds: nothing is read. */
  refresh(): void {
    this.activities = activitiesOf(this.announcements);
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
    this.timer ??= setInterval(() => timerWork("refresh ghosts item", () => this.refresh()), ACTIVITIES_REFRESH_MS);
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
