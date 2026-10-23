/**
 * The pure logic of the omp Chat view (`omp-chat` Machine): which of its three States the window is in, whether the view exists at all (the context key
 * `trama.ompChatVisible`) and which tab takes the view when one closes. The glue (`extension/src/host/omp-chat/`) and the webview only carry out what these say.
 */

/** The States of the `omp-chat` Machine. */
export type ChatViewState = "hidden" | "empty" | "with-conversations";

/**
 * `omp-chat` State: `inUse` is omp Chat on in the user settings with `trama.agent` on omp (`rules#omp-chat`); `conversations` the window's conversations, open
 * or saved and waiting to be resumed. Open conversations keep the view after omp Chat is turned off or the agent changes, until the last one closes.
 */
export function chatViewState(facts: { inUse: boolean; conversations: number }): ChatViewState {
  if (facts.conversations > 0) return "with-conversations";
  return facts.inUse ? "empty" : "hidden";
}

/** The value of the context key `trama.ompChatVisible`: the view is there in Empty and With conversations, not in Hidden. */
export const ompChatVisible = (facts: { inUse: boolean; conversations: number }): boolean => chatViewState(facts) !== "hidden";

/**
 * The value `trama.ompChatVisible` takes (`tech#omp-chat`): `panel` in Cursor, `sidebar` in every other editor while the view is there, `false` otherwise. Each
 * editor has one view for it: `trama.ompChat` in the panel for Cursor, which refuses extension containers in the secondary sidebar, and `trama.ompChatSidebar`.
 */
export type ChatVisibleKey = "panel" | "sidebar" | false;
export const ompChatKey = (visible: boolean, cursor: boolean): ChatVisibleKey => (!visible ? false : cursor ? "panel" : "sidebar");

/** The command that shows the view of the editor in use: the only command Trama runs to open it. */
export const ompChatFocusCommand = (cursor: boolean): string => (cursor ? "trama.ompChat.focus" : "trama.ompChatSidebar.focus");

/**
 * The tab shown after `closed` leaves `order` (the ids in order of opening): `selected` when it is still there, otherwise the neighbour that now sits where the
 * closed tab was (the next one, or the previous one when the closed tab was the last), and none when nothing is left.
 */
export function tabAfterClose(order: readonly string[], closed: string, selected: string | undefined): string | undefined {
  const rest = order.filter((id) => id !== closed);
  if (selected !== undefined && selected !== closed && rest.includes(selected)) return selected;
  const at = order.indexOf(closed);
  if (at === -1) return rest[0];
  return rest[Math.min(at, rest.length - 1)];
}

/** What a key does on a tab: the arrows pass to the next or previous tab (round the ends), `Home` and `End` to the first and last, `Delete` closes. */
export type TabKeyAction = { select: string } | { close: string };

export function tabKeyAction(key: string, order: readonly string[], current: string): TabKeyAction | undefined {
  const at = order.indexOf(current);
  if (at === -1 || order.length === 0) return undefined;
  switch (key) {
    case "ArrowRight":
      return { select: order[(at + 1) % order.length] as string };
    case "ArrowLeft":
      return { select: order[(at - 1 + order.length) % order.length] as string };
    case "Home":
      return { select: order[0] as string };
    case "End":
      return { select: order[order.length - 1] as string };
    case "Delete":
      return { close: current };
    default:
      return undefined;
  }
}
