/** Amounts are whole cents everywhere; only screens turn them into text. */
export type Cents = number;

export function formatAmount(cents: Cents): string {
  return `€${(cents / 100).toFixed(2)}`;
}
