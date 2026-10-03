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
  update(snapshot: Snapshot, asking?: boolean): void;
  /** Called when the view becomes visible or is navigated to. */
  show(options: NavigateOptions): void;
  /** Called when the host reports an error: drops whatever the view was waiting on the host for, such as a move in flight. */
  fail?(): void;
  /** Called when announced cards were withdrawn without being delivered, so the view tells the developer. */
  withdrawn?(announcements: AnnouncementView[]): void;
}

export type MountView = (root: HTMLElement, context: ViewContext) => View;
