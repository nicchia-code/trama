import { LOGOS } from "./logos";

const SVG_NS = "http://www.w3.org/2000/svg";

/** Shown for a technology with no Simple Icons logo: the editor's codicon `package` glyph, copied as a path so no codicon font is needed (CC BY 4.0, see THIRD-PARTY-NOTICES.md). */
const GENERIC_PATH = "M9.04 12.96Q8.88 12.96 8.72 12.88L4.96 11.28Q4.64 11.2 4.52 10.88Q4.4 10.56 4.56 10.28Q4.72 10 5 9.88Q5.28 9.76 5.52 9.92L9.28 11.52Q9.6 11.68 9.72 11.96Q9.84 12.24 9.68 12.48Q9.52 12.96 8.96 12.96ZM7.2 15.28Q7.36 15.28 7.52 15.28Q8 15.28 8.16 14.88Q8.32 14.56 8.2 14.28Q8.08 14 7.76 13.84L5.52 12.88Q5.28 12.8 5 12.92Q4.72 13.04 4.56 13.32Q4.4 13.6 4.52 13.88Q4.64 14.16 4.96 14.32ZM21.04 4.96 13.6 2.08Q12 1.44 10.4 2.08L2.96 4.96Q2.32 5.2 1.92 5.76Q1.52 6.32 1.52 7.04V16.96Q1.52 17.68 1.92 18.24Q2.32 18.8 2.96 19.04L10.4 21.92Q12 22.56 13.6 21.92L21.04 19.04Q21.68 18.8 22.08 18.24Q22.48 17.68 22.48 16.96V7.04Q22.48 6.32 22.08 5.76Q21.68 5.2 21.04 4.96ZM11.28 20.64Q11.12 20.56 10.96 20.56L3.52 17.68Q3.04 17.52 2.96 16.96V7.44L11.28 10.96ZM3.84 6.16 10.96 3.44Q12 3.04 13.04 3.44L20.16 6.16L12 9.68ZM21.04 16.96Q21.04 17.52 20.48 17.68L12.72 20.64V10.96L21.04 7.44Z";

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

/** The logo of a Specs entry, drawn in `currentColor` at 16 px; a generic icon when no logo matches. */
export function iconNode(name: string): SVGSVGElement {
  const logo = logoOf(name);
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "16");
  svg.setAttribute("height", "16");
  svg.setAttribute("class", "sp-icon");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("d", logo ?? GENERIC_PATH);
  path.setAttribute("fill", "currentColor");
  if (logo === null) path.setAttribute("fill-rule", "evenodd");
  svg.append(path);
  return svg;
}
