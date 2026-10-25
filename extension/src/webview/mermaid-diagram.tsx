// A `mermaid` block drawn as a diagram. The library is loaded on demand (`mermaid-loader.ts`) and draws with
// `securityLevel: "strict"` in the panel's theme; its SVG is the only markup that enters the page, and `sanitizeSvg` reads it
// as XML and takes out everything that can run or navigate before it is imported. A block `mermaid` cannot read, a drawing that
// fails or a library that does not load shows as the plain code block, with no message.

import { type ReactNode, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { loadMermaid } from "./mermaid-loader";

/** Elements that can run script, host foreign markup or show a tooltip of their own. */
const REMOVED_ELEMENTS: Record<string, true> = { script: true, foreignobject: true, title: true };

/**
 * The SVG `markup` that `mermaid` returned, read as `image/svg+xml`, without any `script` or `foreignObject` element, any
 * `title` element (a diagram has no tooltips), any `on*` attribute and any `href` that is not a fragment (`#…`), imported into
 * the page's document. Null when the markup is not a well-formed SVG.
 */
export function sanitizeSvg(markup: string): SVGSVGElement | null {
  const parsed = new DOMParser().parseFromString(markup, "image/svg+xml");
  const root = parsed.documentElement;
  if (root === null || root.localName !== "svg" || parsed.getElementsByTagName("parsererror").length > 0) return null;
  for (const element of [root, ...Array.from(root.getElementsByTagName("*"))]) {
    if (element !== root && REMOVED_ELEMENTS[element.localName.toLowerCase()] === true) {
      element.remove();
      continue;
    }
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.localName.toLowerCase();
      if (name.startsWith("on") || (name === "href" && !attribute.value.trim().startsWith("#"))) element.removeAttribute(attribute.name);
    }
  }
  return document.importNode(root, true) as unknown as SVGSVGElement;
}

/** The diagram at its natural size, never more: the box around it scrolls when the text is narrower than that. */
function naturalSize(svg: SVGSVGElement): void {
  const [, , width, height] = (svg.getAttribute("viewBox") ?? "").trim().split(/[\s,]+/).map(Number);
  if (width !== undefined && height !== undefined && width > 0 && height > 0) {
    svg.setAttribute("width", String(width));
    svg.setAttribute("height", String(height));
  }
  svg.style.maxWidth = "none";
}

/** Draws go one at a time: `mermaid` keeps one configuration, and each draw sets the theme it needs. */
let queue: Promise<unknown> = Promise.resolve();
let drawn = 0;

/** The sanitised SVG of a diagram; null when the draw was superseded (`current()` false). Rejects when the diagram cannot be drawn. */
async function draw(source: string, theme: "default" | "dark", fontFamily: string, current: () => boolean): Promise<SVGSVGElement | null> {
  const mermaid = await loadMermaid();
  const task = queue.then(async () => {
    if (!current()) return null;
    mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme, fontFamily, htmlLabels: false, suppressErrorRendering: true });
    const id = `trama-diagram-${++drawn}`;
    try {
      const svg = sanitizeSvg((await mermaid.render(id, source)).svg);
      if (svg === null) throw new Error("mermaid returned no SVG.");
      naturalSize(svg);
      return svg;
    } finally {
      // A failed draw can leave its scratch element in the page.
      document.getElementById(`d${id}`)?.remove();
    }
  });
  queue = task.catch(() => undefined);
  return task;
}

const subscribeTheme = (onChange: () => void): (() => void) => {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
};
const isDark = (): boolean => document.documentElement.classList.contains("dark");

type Drawing = { status: "drawing" } | { status: "done"; svg: SVGSVGElement } | { status: "failed" };

/** The code block, as it is written. */
function Code({ source }: { source: string }): ReactNode {
  return (
    <pre>
      <code>{source}</code>
    </pre>
  );
}

/** A `mermaid` block drawn in the panel's theme and again when the theme changes; code while it fails. */
export function MermaidDiagram({ source }: { source: string }) {
  const dark = useSyncExternalStore(subscribeTheme, isDark);
  const [state, setState] = useState<Drawing>({ status: "drawing" });
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let current = true;
    // What is drawn stays in place while it is drawn again for a new theme or a new text.
    setState((before) => (before.status === "failed" ? { status: "drawing" } : before));
    const fontFamily = getComputedStyle(document.body).fontFamily || "sans-serif";
    draw(source, dark ? "dark" : "default", fontFamily, () => current).then(
      (svg) => {
        if (current && svg !== null) setState({ status: "done", svg });
      },
      () => {
        if (current) setState({ status: "failed" });
      },
    );
    return () => {
      current = false;
    };
  }, [source, dark]);

  useLayoutEffect(() => {
    if (state.status === "done") box.current?.replaceChildren(state.svg);
  }, [state]);

  if (state.status === "failed") return <Code source={source} />;
  if (state.status === "drawing") return <div className="md-diagram-drawing">Drawing diagram…</div>;
  return <div ref={box} className="md-diagram" role="img" aria-label="Diagram" aria-description={source} />;
}
