import type { Snapshot } from "../../../src/core/snapshot";
import type { NavigateOptions, ToHost, ViewName } from "../protocol";

/** What the shell gives each view. */
export interface ViewContext {
  post(message: ToHost): void;
  /** Switch tab, optionally pointing the Diagram at an element or a Proposal. */
  navigate(view: ViewName, options?: NavigateOptions): void;
}

export interface View {
  /** Called with every new snapshot, also while the view is hidden. Must keep the user's zoom, selection and breadcrumb when it can. */
  update(snapshot: Snapshot): void;
  /** Called when the view becomes visible or is navigated to. */
  show(options: NavigateOptions): void;
}

export type MountView = (root: HTMLElement, context: ViewContext) => View;
