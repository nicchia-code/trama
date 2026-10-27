// Astro does not put the site's base path in front of the root-relative links and images of a Markdown file, so a guide
// page that writes `/guide/concepts/model/` or `/docs-images/board.png` would point outside `/trama/`. This plugin adds it.

interface HastNode {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
}

/** `/x` becomes `<base>x`; a link that already starts with the base, `//host`, `https://…`, `#…` and `mailto:` stay as they are. */
export function withBase(base: string, url: unknown): unknown {
  if (typeof url !== "string" || !url.startsWith("/") || url.startsWith("//") || url.startsWith(base)) return url;
  return base + url.slice(1);
}

function visit(node: HastNode, base: string): void {
  const props = node.properties;
  if (node.type === "element" && props) {
    if (node.tagName === "a" && props.href) props.href = withBase(base, props.href);
    if (node.tagName === "img" && props.src) props.src = withBase(base, props.src);
  }
  for (const child of node.children ?? []) visit(child, base);
}

/** A rehype plugin: `[rehypeBase, { base: "/trama/" }]`. */
export function rehypeBase({ base }: { base: string }) {
  return (tree: HastNode) => visit(tree, base);
}
