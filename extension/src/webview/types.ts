import type { ReactNode } from "react";
import type { AnnouncementView, Snapshot } from "../../../src/core/snapshot";
import type { NavigateOptions, ToHost, ViewName } from "../protocol";

/** What the shell gives each view. */
export interface ViewContext {
  post(message: ToHost): void;
  /** Switch tab, optionally pointing the Diagram at an element or a Proposal. */
  navigate(view: ViewName, options?: NavigateOptions): void;
  /** Follow an http or https link of a rendered text: the host opens it in the system browser. */
  openLink(url: string): void;
}

export interface View {
  /**
   * Called with every new snapshot, also while the view is hidden. Must keep the user's zoom, selection and breadcrumb
   * when it can. `asking`: a question round is open.
   */
  update(snapshot: Snapshot, asking?: boolean, resolve?: { blocker: string | null; runReason: string | null; drifts: Record<string, string | null>; resolving: string[] }, scans?: { advisorScanner: boolean }): void;
  /** Called when the view becomes visible or is navigated to. */
  show(options: NavigateOptions): void;
  /** Called when announced cards were withdrawn without being delivered, so the view tells the developer. */
  withdrawn?(announcements: AnnouncementView[]): void;
  /** Called when the run control stopped following a job or a Task, so the view tells the developer what and why. */
  stoppedFollowing?(subject: string, reason: string): void;
}

/** Where a view puts what it draws: the panel has one React root, and each view gives it the element of its tab. */
export type Slot = (node: ReactNode) => void;

export type MountView = (slot: Slot, context: ViewContext) => View;
