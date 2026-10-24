/**
 * The pure logic of the omp Chat view (`omp-chat` Machine): which of its three States the window is in, whether the view exists at all (the context key
 * `trama.ompChatVisible`) and which tab takes the view when one closes. The glue (`extension/src/host/omp-chat/`) and the webview only carry out what these say.
 */

/** The States of the `omp-chat` Machine. */
export type ChatViewState = "hidden" | "empty" | "with-conversations";

/** The id of General's tab: the window's one conversation that is not a job's. */
export const GENERAL_ID = "general";

/**
 * `omp-chat` State: `inUse` is omp Chat on (not turned off in the user settings, `rules#omp-chat`); `folder` whether the window has a folder open; `general`
 * whether General is in the view; `conversations` the job conversations, open or saved and waiting to be resumed. Empty exists only in a window without a folder,
 * since there General is what the view shows.
 */
export interface ChatViewFacts {
  inUse: boolean;
  folder: boolean;
  general: boolean;
  conversations: number;
}

export function chatViewState(facts: ChatViewFacts): ChatViewState {
  if (facts.general || facts.conversations > 0) return "with-conversations";
  return facts.inUse && !facts.folder ? "empty" : "hidden";
}

/**
 * The value of the context key `trama.ompChatVisible`: true while omp Chat is in use, or while the window has General or a conversation open. Turning omp Chat
 * off keeps the view while a conversation is open.
 */
export const ompChatVisible = (facts: ChatViewFacts): boolean => facts.inUse || facts.general || facts.conversations > 0;

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
