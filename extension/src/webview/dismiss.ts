import { joinReasons } from "../../../src/core/design";
import { setIconLabel } from "./icons";
/** The text `Resolve Drifts` puts in its reason while an agent works on the Drifts (`resolveDriftsBlocker` in `src/core`). */
const RESOLVING_REASON = "Drifts are being resolved";

/** Why «Dismiss Drift» cannot be used on this open Drift now, or null: an agent is still finishing the turn that filed it (first, as every button's reason), it sits in a resolution being written or open, or an agent works on the Drifts. All the reasons that hold are given. `resolutionDrifts` and `finishingDrifts` are the Snapshot's lists of those. */
export function dismissBlocker(driftId: string, resolutionDrifts: readonly string[], resolveBlocker: string | null, finishingDrifts: readonly string[]): string | null {
  return joinReasons([
    finishingDrifts.includes(driftId) ? "The agent is still finishing" : null,
    resolutionDrifts.includes(driftId) ? "This Drift is part of a resolution: decide it there" : null,
    resolveBlocker?.includes(RESOLVING_REASON) ? "An agent is resolving Drifts" : null,
  ]);
}

export interface DismissOptions {
  /** Why the button is disabled; null when it works. */
  blocker: string | null;
  className?: string;
  /** Called on the click; the host asks for the confirmation. */
  onDismiss(): void;
}

/** «Dismiss Drift»: closes the Drift without changes. The host confirms in a modal dialog, so a click only sends the request. */
export function dismissButton(o: DismissOptions): HTMLButtonElement {
  const node = document.createElement("button");
  node.type = "button";
  node.className = `trama-btn${o.className ? ` ${o.className}` : ""}`;
  setIconLabel(node, "circle-slash", "Dismiss Drift");
  node.dataset["action"] = "dismiss";
  if (o.blocker !== null) {
    node.disabled = true;
    node.title = o.blocker;
    node.setAttribute("aria-description", o.blocker);
  } else {
    node.title = "Close this Drift without changes";
    node.addEventListener("click", () => o.onDismiss());
  }
  return node;
}
