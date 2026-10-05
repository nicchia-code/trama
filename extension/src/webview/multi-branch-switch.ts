/** Label, tooltip and role shared by the switch on every tab. */
export const MULTI_BRANCH_LABEL = "Multi-branch";
export const MULTI_BRANCH_TOOLTIP = "When on, accepting an ordinary Proposal runs it in a worktree.";

export interface MultiBranchSwitch {
  element: HTMLButtonElement;
  setOn(on: boolean): void;
}

/**
 * A switch named Multi-branch. A click asks for the other state at once, with no confirmation.
 * The shown state changes only when `setOn` is called, so a refused or failed write leaves it as it was.
 */
export function createMultiBranchSwitch(turn: (on: boolean) => void): MultiBranchSwitch {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "trama-switch";
  button.setAttribute("role", "switch");
  button.title = MULTI_BRANCH_TOOLTIP;
  const label = document.createElement("span");
  label.textContent = MULTI_BRANCH_LABEL;
  const track = document.createElement("span");
  track.className = "trama-switch-track";
  track.setAttribute("aria-hidden", "true");
  const thumb = document.createElement("span");
  thumb.className = "trama-switch-thumb";
  track.append(thumb);
  button.append(label, track);

  let on = false;
  const setOn = (next: boolean) => {
    on = next;
    button.setAttribute("aria-checked", next ? "true" : "false");
  };
  setOn(false);
  button.addEventListener("click", () => turn(!on));
  return { element: button, setOn };
}
