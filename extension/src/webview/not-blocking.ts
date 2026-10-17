import type { NotBlockingItem } from "./board/logic";

/**
 * The line `Not blocking: T3, T5` under a Drift's Tasks: the Tasks it leaves free, by short number or identity. Each one
 * has its reason as tooltip and accessible name, and opens nothing. Null when there is no Task to show.
 */
export function notBlockingLine(items: NotBlockingItem[]): HTMLElement | null {
  if (items.length === 0) return null;
  const line = document.createElement("p");
  line.className = "board-muted board-not-blocking";
  line.append(document.createTextNode("Not blocking: "));
  items.forEach((item, i) => {
    if (i > 0) line.append(document.createTextNode(", "));
    const number = document.createElement("span");
    number.className = "board-not-blocking-task";
    number.textContent = item.name.text;
    const text = `Not blocked by this Drift: ${item.reason}`;
    number.title = text;
    number.setAttribute("role", "img");
    number.setAttribute("aria-label", text);
    line.append(number);
  });
  return line;
}
