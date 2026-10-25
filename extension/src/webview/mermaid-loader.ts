// Loads `mermaid` once per page, on demand. The library is its own bundle, `mermaid.js` (`mermaid-entry.ts`), never part of
// `webview.js` or `omp-chat.js`: the first diagram adds a `<script>` with the page's nonce and the address the host put in
// `<body data-mermaid-src>` (a webview URI, so from `cspSource`), and the later diagrams wait for the same load. The page's CSP
// does not change. A page without that address, or a script that does not load, rejects, and the diagram shows as code.

/** The part of `mermaid` the panel uses. */
export interface MermaidApi {
  initialize(config: Record<string, unknown>): void;
  render(id: string, text: string): Promise<{ svg: string }>;
}

declare global {
  // The global the bundle hands the library over as (and the place a test puts its stub).
  var mermaid: MermaidApi | undefined;
}

/** The load of each page (document), so a page loads the bundle once and every diagram of it waits for the same load. */
const loads = new WeakMap<Document, Promise<MermaidApi>>();

/** The nonce of the page: the one its own script carries (the browser hides the attribute, not the property). */
function pageNonce(doc: Document): string {
  for (const script of Array.from(doc.scripts)) if (script.nonce !== "") return script.nonce;
  return "";
}

/** `mermaid`, loaded the first time it is asked for. Rejects when the page cannot load it; the rejection stays for the rest of the page. */
export function loadMermaid(doc: Document = document): Promise<MermaidApi> {
  if (globalThis.mermaid !== undefined) return Promise.resolve(globalThis.mermaid);
  const started = loads.get(doc);
  if (started !== undefined) return started;
  const { promise, resolve, reject } = Promise.withResolvers<MermaidApi>();
  loads.set(doc, promise);
  const src = doc.body.dataset.mermaidSrc;
  if (src === undefined || src === "") {
    reject(new Error("The page has no address for mermaid."));
    return promise;
  }
  const script = doc.createElement("script");
  script.nonce = pageNonce(doc);
  script.src = src;
  script.onload = () => (globalThis.mermaid === undefined ? reject(new Error("mermaid did not load.")) : resolve(globalThis.mermaid));
  script.onerror = () => reject(new Error("mermaid could not be loaded."));
  doc.head.append(script);
  return promise;
}
