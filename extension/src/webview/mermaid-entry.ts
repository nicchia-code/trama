// Entry of the `mermaid.js` bundle: `mermaid` in its own `iife` file, loaded on demand by the first diagram of a page
// (`mermaid-loader.ts`) and never inlined in `webview.js` or `omp-chat.js`. It hands the library over as `globalThis.mermaid`.
import mermaid from "mermaid";

(globalThis as { mermaid?: unknown }).mermaid = mermaid;
