/** The normalised address of an http or https link, or null for any other target (relative paths, `javascript:`, `file:`…). */
export function safeLink(target: string): string | null {
  if (!/^https?:\/\//i.test(target)) return null;
  try {
    return new URL(target).href;
  } catch {
    return null;
  }
}
