import type { FocusRequest } from "../../protocol";
import { type Step, stepIndex } from "./spec";

/** The focus of the Requirements or Specs tab: where it started and which step the page was brought to. */
export interface PageFocus {
  request: FocusRequest;
  /** Key of the step the page is at; null while the tab has no step. */
  step: string | null;
  /** Grows each time the page must scroll to `step`. */
  nonce: number;
  /** `Only these`, in the Requirements; always false in the Specs. */
  only: boolean;
}

export const openPageFocus = (request: FocusRequest): PageFocus => ({ request, step: null, nonce: 0, only: false });

/** Keeps the focus at its step while that step exists, otherwise takes it to the first (`rules#focus`), scrolling there. */
export function settle(focus: PageFocus, steps: readonly Step[]): PageFocus {
  const key = steps[stepIndex(steps, focus.step)]?.key ?? null;
  return key === focus.step ? focus : { ...focus, step: key, nonce: focus.nonce + 1 };
}

/** Goes to a step and scrolls there. */
export const goTo = (focus: PageFocus, key: string): PageFocus => ({ ...focus, step: key, nonce: focus.nonce + 1 });

/** Scrolls the page so the start of the step is at the top of the visible area, smoothly unless the system asks for reduced motion. */
export function scrollToStep(container: HTMLElement, key: string): void {
  const target = [...container.querySelectorAll<HTMLElement>("[data-step]")].find((el) => el.dataset.step === key);
  if (!target || typeof container.scrollTo !== "function") return;
  const top = target.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop;
  const reduced = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  container.scrollTo({ top, behavior: reduced ? "auto" : "smooth" });
}
