import type { AnnouncementKind } from "./announcements";

// Pure and free of Node imports: the Board's webview bundle and the editor host both use it.

/** What an announcement is, as the Board shows it: the announced kinds, plus the ghosts Trama announces for a manual scan, Resolve Drifts and Unify Drifts. */
export type GhostKind = AnnouncementKind | "scan" | "resolve" | "unify";
/** The Board column a ghost stands in, or `none` when its kind has no column (it goes to the status bar). */
export type GhostColumn = "backlog" | "active" | "none";

/** The column of the card a ghost announces: Proposals, resolutions, Drifts and unifications in Backlog, Tasks in Active; checks, scans, comparisons and works have none. */
export function ghostColumn(kind: GhostKind): GhostColumn {
  switch (kind) {
    case "proposal":
    case "resolve":
    case "drift":
    case "unify":
      return "backlog";
    case "task":
      return "active";
    case "check":
    case "scan":
    case "comparison":
    case "work":
      return "none";
  }
}
