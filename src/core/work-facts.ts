import { listAnnouncements } from "./announcements";
import { publishingIssues } from "./issues";
import type { Picture } from "./snapshot";
import { type Project } from "./store";
import { listTasks } from "./work";

/** The holder of something the execution check looks at: the identity of a Trama terminal or omp Chat conversation, null when none is recorded. */
export interface WorkFacts {
  /** The Tasks taken by an agent (`agent` other than `false`), with who holds each. */
  taken: { id: string; holder: string | null }[];
  /** The live announcements, with the terminal each belongs to (null for one that belongs to none). */
  announcements: { id: string; terminal: string | null }[];
  /** The issues being published, with the terminal that publishes each. */
  publishing: { id: string; holder: string | null }[];
}

/** What the execution check looks at, taken from a picture already in memory: it reads nothing. */
export function workOfPicture(picture: Picture): WorkFacts {
  return {
    taken: picture.tasks.filter((task) => task.data.agent).map((task) => ({ id: task.id, holder: task.data.holder })),
    announcements: picture.announcements.map((announcement) => ({ id: announcement.id, terminal: announcement.terminal })),
    publishing: picture.publishing.map((issue) => ({ id: issue.id, holder: issue.holder })),
  };
}

/**
 * What the execution check looks at, read from the disk: for a project the window has no picture of (another folder it launched work in) and for the command line.
 * With `tasksOnly` only the Tasks are read.
 */
export function workOnDisk(project: Project, tasksOnly = false): WorkFacts {
  return {
    taken: listTasks(project).filter((task) => task.data.agent).map((task) => ({ id: task.id, holder: task.data.holder })),
    announcements: tasksOnly ? [] : listAnnouncements(project).map((announcement) => ({ id: announcement.id, terminal: announcement.terminal })),
    publishing: tasksOnly ? [] : publishingIssues(project),
  };
}
