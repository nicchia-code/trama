import { Package } from "lucide-react";
import { LOGOS } from "./logos";

/** Letters and digits only, lower case: `Next.js` and `nextdotjs` both read `nextjs`/`nextdotjs`, matched by title or slug. */
const key = (text: string): string => text.toLowerCase().replace(/[^a-z0-9]/g, "");

let byName: Map<string, string> | null = null;

/** The logo path of a name (title or slug, ignoring case, spaces and punctuation), or null. Built once, from the built-in logos. */
export function logoOf(name: string): string | null {
  if (byName === null) {
    byName = new Map();
    for (const [title, slug, path] of LOGOS) {
      byName.set(key(title), path);
      byName.set(key(slug), path);
    }
  }
  return byName.get(key(name)) ?? null;
}

/** The logo of a Specs entry, drawn in `currentColor` at 16 px; the lucide `Package` icon when no logo matches. */
export function SpecIcon({ name }: { name: string }) {
  const logo = logoOf(name);
  if (logo === null) return <Package aria-hidden="true" width={16} height={16} className="sp-icon shrink-0" />;
  return (
    <svg viewBox="0 0 24 24" width={16} height={16} className="sp-icon shrink-0" aria-hidden="true">
      <path d={logo} fill="currentColor" />
    </svg>
  );
}
