import { type CardName, ID_NAMES } from "../../../src/core/card-names";

/**
 * A card's short number while it is live, otherwise its permanent identity, in the same place and the same monospaced
 * font. The tooltip and the accessible name say which it is, so the way it is written is not the only signal.
 */
export function idTag(name: CardName, className = "board-card-id"): HTMLElement {
  const what = name.isNumber ? ID_NAMES.number : ID_NAMES.identity;
  const node = document.createElement("span");
  node.className = className;
  node.textContent = name.text;
  node.title = what;
  node.setAttribute("role", "img");
  node.setAttribute("aria-label", `${what} ${name.text}`);
  return node;
}
