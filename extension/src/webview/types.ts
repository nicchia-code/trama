import type { AnnouncementView, Snapshot } from "../../../src/core/snapshot";
import type { DriftAutopilotStatus } from "../host/drift-resolution";
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
  update(snapshot: Snapshot, asking?: boolean, resolve?: { blocker: string | null; runReason: string | null; autopilot: DriftAutopilotStatus }): void;
  /** Called when the view becomes visible or is navigated to. */
  show(options: NavigateOptions): void;
  /** Called when announced cards were withdrawn without being delivered, so the view tells the developer. */
  withdrawn?(announcements: AnnouncementView[]): void;
}

export type MountView = (root: HTMLElement, context: ViewContext) => View;
