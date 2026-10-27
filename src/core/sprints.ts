import type { GitHubField, GitHubIteration } from "./github";
import { type Absence, addDays } from "./people";

/*
 * The calendar of the Timeline (`rules#issue/Published`, `rules#github-project/Linked`): the working days of a sprint, a person's capacity and load in it, the sprints the
 * Timeline shows and whether the Project lacks sprints. Pure data in, data out, with no clock (today is a parameter) and no node module, so the Team view's webview imports it
 * too: that is why it is not part of `timeline.ts`, which reads what GitHub says.
 */

type Dates = Pick<GitHubIteration, "startDate" | "duration">;

/** Whether `date` (`YYYY-MM-DD`) is a Monday to Friday. */
export function isWorkingDay(date: string): boolean {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return day >= 1 && day <= 5;
}

/** `3.5`, `5`: a number of days without the unit. */
export const numberText = (days: number): string => String(Math.round(days * 10) / 10);

/** The estimate field of a Project: its first number field whose name contains `estimate` or `days`, without case; none when it has no such field. */
export const estimateField = (fields: readonly GitHubField[]): GitHubField | undefined => fields.find((field) => field.type === "NUMBER" && /estimate|days/i.test(field.name));

/** The working days (Monday to Friday) of an iteration within its dates, `YYYY-MM-DD`, in order. */
export function workingDaysOf(iteration: Dates): string[] {
  const days: string[] = [];
  for (let offset = 0; offset < iteration.duration; offset++) {
    const day = addDays(iteration.startDate, offset);
    if (isWorkingDay(day)) days.push(day);
  }
  return days;
}

const isAbsent = (day: string, absences: readonly Absence[]): boolean => absences.some((absence) => absence.from <= day && day <= absence.to);

/** The working days of an iteration an absence takes: what the Timeline's absence block is as wide as. */
export const absenceDaysIn = (absence: Absence, iteration: Dates): number => workingDaysOf(iteration).filter((day) => isAbsent(day, [absence])).length;

/** The last day of an iteration, `YYYY-MM-DD`. */
export const lastDayOf = (iteration: Dates): string => addDays(iteration.startDate, iteration.duration - 1);

/**
 * The capacity of a person in a sprint: their capacity per sprint times the working days of the sprint that are not absences, divided by 5, rounded to 0.5. It takes the two
 * fields it needs, so a person of the editor (`PersonView`) and a plain object both fit.
 */
export function capacityIn(person: { capacity: number; absences: readonly Absence[] }, iteration: Dates): number {
  const present = workingDaysOf(iteration).filter((day) => !isAbsent(day, person.absences)).length;
  return Math.round(person.capacity * present * 0.4) / 2;
}

/** What an open item of the Project that has an assignee and a sprint adds to the load of that person in that sprint. `estimate` is null when the item has none. */
export interface OpenLoad {
  /** The GitHub login of the first assignee. */
  assignee: string;
  /** The title of the sprint. */
  sprint: string;
  estimate: number | null;
}

/** What a person has in a sprint: the days their open items add up to (a person is matched to an assignee by handle, without case) and how many of those items have no estimate. */
export function loadIn(loads: readonly OpenLoad[], handle: string, sprint: string): { days: number; unestimated: number } {
  const mine = loads.filter((load) => load.sprint === sprint && load.assignee.toLowerCase() === handle.toLowerCase());
  return { days: mine.reduce((sum, load) => sum + (load.estimate ?? 0), 0), unestimated: mine.filter((load) => load.estimate === null).length };
}

const byStart = (a: GitHubIteration, b: GitHubIteration): number => (a.startDate < b.startDate ? -1 : a.startDate > b.startDate ? 1 : 0);

/**
 * The sprints the Timeline shows (`rules#github-project/Linked`): from the earliest sprint, current or past, that holds an open published issue (`openSprints`, their titles), or
 * from the current sprint when none, to the last iteration of the Project. With no current sprint (between two) the first one that has not started stands in, and when every
 * sprint is over the last one.
 */
export function sprintsShown(iterations: readonly GitHubIteration[], openSprints: ReadonlySet<string>, today: string): GitHubIteration[] {
  if (iterations.length === 0) return [];
  const sorted = [...iterations].sort(byStart);
  const started = sorted.findIndex((iteration) => iteration.startDate <= today && openSprints.has(iteration.title));
  if (started >= 0) return sorted.slice(started);
  const current = sorted.findIndex((iteration) => today <= lastDayOf(iteration));
  return sorted.slice(current >= 0 ? current : sorted.length - 1);
}

/** How many days after today the last iteration must end for the Project to have enough sprints: three weeks. */
export const SPRINTS_AHEAD_DAYS = 21;

/**
 * Whether the Project lacks sprints (`rules#github-project/Linked`): its last iteration ends less than three weeks after today. `last` is that iteration, or null when the
 * Project has no iteration at all; `undefined` is returned when it has enough sprints.
 */
export function lacksSprints(iterations: readonly GitHubIteration[], today: string): { last: GitHubIteration | null } | undefined {
  const last = [...iterations].sort(byStart).at(-1) ?? null;
  if (last === null) return { last: null };
  return lastDayOf(last) < addDays(today, SPRINTS_AHEAD_DAYS) ? { last } : undefined;
}
