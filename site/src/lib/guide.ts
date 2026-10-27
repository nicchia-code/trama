/** The guide's four sections, in the order the sidebar shows them. A page lives in the folder named by its section's `id`. */
export const GUIDE_SECTIONS = [
  { id: "getting-started", title: "Getting started" },
  { id: "concepts", title: "Concepts" },
  { id: "workflows", title: "Workflows" },
  { id: "panel-and-settings", title: "Panel & settings" },
] as const;

/** What the sidebar needs to know about a page. `id` is `<section>/<page>`, as the content collection names it. */
export interface GuidePage {
  id: string;
  title: string;
  order: number;
}

export interface GuideSection {
  id: string;
  title: string;
  pages: GuidePage[];
}

/** The pages grouped in their sections, the sections in the sidebar's order and the pages by `order` (then by title). */
export function buildGuideNav(pages: readonly GuidePage[]): GuideSection[] {
  const known = new Set<string>(GUIDE_SECTIONS.map((s) => s.id));
  for (const page of pages) {
    const section = page.id.split("/")[0] ?? "";
    if (!known.has(section)) throw new Error(`Guide page "${page.id}" is not in a known section folder (${[...known].join(", ")})`);
  }
  return GUIDE_SECTIONS.map((section) => ({
    id: section.id,
    title: section.title,
    pages: pages
      .filter((p) => p.id.startsWith(`${section.id}/`))
      .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title)),
  }));
}

/** The page before and the page after `id` in reading order, across sections; `undefined` at the two ends. */
export function neighbours(nav: readonly GuideSection[], id: string): { previous?: GuidePage; next?: GuidePage } {
  const flat = nav.flatMap((s) => s.pages);
  const at = flat.findIndex((p) => p.id === id);
  if (at < 0) return {};
  return { previous: flat[at - 1], next: flat[at + 1] };
}

/** The section a page belongs to. */
export function sectionOf(nav: readonly GuideSection[], id: string): GuideSection | undefined {
  return nav.find((s) => s.id === id.split("/")[0]);
}
