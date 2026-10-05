// No Node imports: the panel in the webview writes cards by number the same way the command line does.

/** The three kinds of card that carry a short number. */
export type CardKind = "proposal" | "task" | "drift";

/** The short numbers of the live cards of a working copy, by kind: permanent identity -> `T3`. A card that is not in it is closed. */
export type CardNumbers = Record<CardKind, Record<string, string>>;

/** How a card is written: its text, and whether that text is its short number (otherwise its permanent identity). */
export interface CardName {
  text: string;
  isNumber: boolean;
}

/** The short number of a live card, otherwise the permanent identity: never both. */
export function cardNameOf(numbers: CardNumbers, kind: CardKind, id: string): CardName {
  const number = numbers[kind][id];
  return number === undefined ? { text: id, isNumber: false } : { text: number, isNumber: true };
}

/** The text of `cardNameOf`, for sentences. */
export function cardLabel(numbers: CardNumbers, kind: CardKind, id: string): string {
  return numbers[kind][id] ?? id;
}

/** Tooltip and accessible name of the number or the identity of a card, so how it is written is not the only signal. */
export const ID_NAMES = { number: "Short number (temporary)", identity: "Permanent ID" } as const;

/** How a card is written in a sentence: its short number while live, otherwise its identity. */
export type Namer = (kind: CardKind, id: string) => string;

/** Writes every card by its identity: what a reader without numbers gets. */
export const identityNamer: Namer = (_kind, id) => id;

/** The `Namer` of a working copy's numbers. */
export const namerOf =
  (numbers: CardNumbers): Namer =>
  (kind, id) =>
    cardLabel(numbers, kind, id);

/** No card has a number: every card is written by its identity. */
export const noNumbers: CardNumbers = { proposal: {}, task: {}, drift: {} };
