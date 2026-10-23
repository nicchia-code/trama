// Pure part of the status bar item of the ghosts that have no Board column: no editor API, so it is tested on its own.
import { ghostColumn } from "../../../src/core/ghost-column";
import type { AnnouncementView } from "../../../src/core/snapshot";
import { announcedCard, type AnnouncedCard, runningFor } from "../webview/board/logic";

/** The id of the status bar item, the name it carries in the status bar menu and the command its click runs. */
export const ACTIVITIES_ITEM_ID = "trama.activities";
export const ACTIVITIES_ITEM_NAME = "Trama Activities";
export const SHOW_ACTIVITIES_COMMAND = "trama.showActivities";
/** Lower than the priority of every other item of Trama, so it stands last of the left group, the nearest to the centre the API allows. */
export const ACTIVITIES_PRIORITY = -10000;
/** How often `Running for` is recomputed while the item shows. */
export const ACTIVITIES_REFRESH_MS = 30_000;
export const ACTIVITIES_PLACEHOLDER = "Choose an activity to see its details";

/** A ghost with no column, as the status bar item and its list show it. */
export interface Activity {
  id: string;
  card: AnnouncedCard;
}

/** The ghosts with no column (see `ghostColumn`), the most recently announced first. `announcements` come in the order announced. */
export function activitiesOf(announcements: readonly AnnouncementView[]): Activity[] {
  return announcements
    .filter((a) => ghostColumn(a.kind) === "none")
    .map((a) => ({ id: a.id, card: announcedCard(a, false) }))
    .reverse();
}

/** What the item shows for `activities` (newest first, at least one): its text, plain tooltip and accessible name. */
export function summarize(activities: readonly Activity[], now: Date = new Date()): { text: string; tooltip: string; label: string } {
  const [shown, ...others] = activities;
  if (shown === undefined) throw new Error("summarize needs at least one activity");
  const { card } = shown;
  const text = `$(loading~spin) ${card.title}${others.length > 0 ? ` +${others.length}` : ""}`;
  const lines = [`${card.kindLabel} · ${card.title}`];
  if (card.phase !== "") lines.push(card.phase);
  lines.push(`Running for ${runningFor(card.announced, now)}`);
  if (card.note !== null) lines.push(card.note);
  if (others.length > 0) lines.push(`+${others.length} more running`);
  const label = `${card.label}${others.length > 0 ? `, and ${others.length} more` : ""}. Show details`;
  return { text, tooltip: lines.join("\n"), label };
}

/** An option of the list the click opens with several ghosts. */
export interface ActivityOption {
  id: string;
  label: string;
  description: string;
  detail: string | undefined;
}

/** One option per ghost, in the order given: the title, `<kind> · <phase>` (the kind alone without a phase) and the latest note. */
export function activityOptions(activities: readonly Activity[]): ActivityOption[] {
  return activities.map(({ id, card }) => ({
    id,
    label: card.title,
    description: card.phase === "" ? card.kindLabel : `${card.kindLabel} · ${card.phase}`,
    detail: card.note ?? undefined,
  }));
}
