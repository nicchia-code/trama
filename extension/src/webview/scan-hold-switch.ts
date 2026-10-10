/** Label and tooltip shared by the switch on every tab. */
export const SCAN_HOLD_LABEL = "Hold scan";
export const SCAN_HOLD_TOOLTIP = "When on, approvals wait and one scan runs when you turn it off.";

export interface ScanHoldSwitch {
  element: HTMLButtonElement;
  set(on: boolean, held: number): void;
}

/**
 * The Hold scan switch. A click shows the other state at once, with no confirmation, and asks the host for it. The host
 * always answers with a fresh picture: a refused or failed change brings the previous state back through `set`.
 * Its label and accessible name count the held Proposals when there are any.
 */
export function createScanHoldSwitch(turn: (on: boolean) => void): ScanHoldSwitch {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "trama-switch";
  button.setAttribute("role", "switch");
  button.title = SCAN_HOLD_TOOLTIP;
  const label = document.createElement("span");
  const track = document.createElement("span");
  track.className = "trama-switch-track";
  track.setAttribute("aria-hidden", "true");
  const thumb = document.createElement("span");
  thumb.className = "trama-switch-thumb";
  track.append(thumb);
  button.append(label, track);

  let on = false;
  let shownHeld = 0;
  const set = (next: boolean, held: number) => {
    on = next;
    shownHeld = held;
    button.setAttribute("aria-checked", next ? "true" : "false");
    label.textContent = held > 0 ? `${SCAN_HOLD_LABEL} · ${held}` : SCAN_HOLD_LABEL;
    button.setAttribute("aria-label", held > 0 ? `${SCAN_HOLD_LABEL}, ${held} held` : SCAN_HOLD_LABEL);
  };
  set(false, 0);
  button.addEventListener("click", () => {
    const next = !on;
    set(next, shownHeld);
    turn(next);
  });
  return { element: button, set };
}
