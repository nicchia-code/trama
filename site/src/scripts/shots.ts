import { revealOnScroll } from "./reveal";

/** The class that shows a screenshot already drawn, with nothing animating: the enlarged copy in the dialog. */
const STATIC = "shot-static";

let dialog: HTMLDialogElement | null = null;
let opener: HTMLElement | null = null;

/** The one `<dialog>` of the page, made the first time a screenshot is enlarged. */
function ensureDialog(): HTMLDialogElement {
  if (dialog?.isConnected) return dialog;
  const created = document.createElement("dialog");
  created.className = "shot-dialog";
  created.innerHTML = `<button type="button" class="shot-close" aria-label="Close the enlarged screenshot">×</button><div class="shot-dialog-body"></div>`;
  created.querySelector(".shot-close")?.addEventListener("click", () => created.close());
  // The dialog has no padding, so a click that lands on the dialog itself is a click on the dimmed page around it.
  created.addEventListener("click", (event) => {
    if (event.target === created) created.close();
  });
  created.addEventListener("close", () => {
    document.documentElement.classList.remove("shot-modal-open");
    created.querySelector(".shot-dialog-body")?.replaceChildren();
    opener?.focus();
    opener = null;
  });
  document.body.append(created);
  dialog = created;
  return created;
}

/** Opens a copy of the screenshot of `button` in the dialog, its marks and notes scaled with it. */
export function openEnlarged(button: HTMLElement): void {
  const figure = button.closest<HTMLElement>(".shot");
  if (!figure) return;
  const view = ensureDialog();
  const copy = figure.cloneNode(true) as HTMLElement;
  copy.classList.add(STATIC, "in-view");
  const copyButton = copy.querySelector(".shot-open");
  copyButton?.querySelector(".sr-only")?.remove();
  copyButton?.replaceWith(...Array.from(copyButton.childNodes));
  for (const image of copy.querySelectorAll("img")) image.loading = "eager";
  view.querySelector(".shot-dialog-body")?.replaceChildren(copy);
  view.style.setProperty("--ratio", figure.style.getPropertyValue("--ratio"));
  view.setAttribute("aria-label", figure.querySelector("img")?.alt || "Enlarged screenshot");
  opener = button;
  document.documentElement.classList.add("shot-modal-open");
  view.showModal();
}

/**
 * Starts the screenshots of the page: each one draws itself the first time it enters the screen (the class `in-view`, then
 * CSS does the rest), and a click or Enter on one opens it enlarged. Without `IntersectionObserver` the screenshots show
 * drawn at once.
 */
export function initShots(): void {
  revealOnScroll(document.querySelectorAll(".shot"));
  document.addEventListener("click", (event) => {
    const button = (event.target as Element | null)?.closest?.<HTMLElement>(".shot-open");
    if (button) openEnlarged(button);
  });
}
