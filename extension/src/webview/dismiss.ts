import type { ProposalView } from "../../../src/core/snapshot";

/** The text `Resolve Drifts` puts in its reason while an agent works on the Drifts (`resolveDriftsBlocker` in `src/core`). */
const RESOLVING_REASON = "Drifts are being resolved";

/** Why «Dismiss Drift» cannot be used on this open Drift now, or null: it sits in a resolution, or an agent works on the Drifts. */
export function dismissBlocker(driftId: string, proposals: readonly ProposalView[], resolveBlocker: string | null): string | null {
  if (proposals.some((p) => p.kind === "resolution" && p.resolves.some((r) => r.drift === driftId))) return "This Drift is part of a resolution: decide it there";
  if (resolveBlocker?.includes(RESOLVING_REASON)) return "An agent is resolving Drifts";
  return null;
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
  node.textContent = "Dismiss Drift";
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
