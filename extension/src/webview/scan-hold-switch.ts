/** Label and tooltip shared by the switch on every tab. */
export const SCAN_HOLD_LABEL = "Hold scan";
export const SCAN_HOLD_TOOLTIP = "When on, approvals wait and one scan runs when you turn it off.";

export interface ScanHoldSwitch {
  element: HTMLButtonElement;
  set(on: boolean, held: number): void;
}

/**
 * The Hold scan switch. A click asks for the other state at once, with no confirmation; the shown state changes only
 * when `set` is called, so a refused or failed write leaves it as it was. Its label and accessible name count the held
 * Proposals when there are any.
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
  const set = (next: boolean, held: number) => {
    on = next;
    button.setAttribute("aria-checked", next ? "true" : "false");
    label.textContent = held > 0 ? `${SCAN_HOLD_LABEL} · ${held}` : SCAN_HOLD_LABEL;
    button.setAttribute("aria-label", held > 0 ? `${SCAN_HOLD_LABEL}, ${held} held` : SCAN_HOLD_LABEL);
  };
  set(false, 0);
  button.addEventListener("click", () => turn(!on));
  return { element: button, set };
}
