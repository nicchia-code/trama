// Bundles the extension host (Node, CommonJS), the webview (browser) and the hook omp loads (Bun, ESM) into extension/dist/.
import { mkdirSync } from "node:fs";
import type { BunPlugin } from "bun";

mkdirSync("extension/dist", { recursive: true });

/** `tailwind:css` is the panel's one stylesheet: Tailwind CSS 4 compiled from `styles.css`, loaded as text by the webview. */
const tailwind: BunPlugin = {
  name: "tailwind",
  setup(build) {
    build.onResolve({ filter: /^tailwind:css$/ }, () => ({ path: "tailwind:css", namespace: "tailwind" }));
    build.onLoad({ filter: /.*/, namespace: "tailwind" }, async () => {
      const compiled = await Bun.$`bun x tailwindcss --input extension/src/webview/styles.css --minify`.quiet();
      return { contents: compiled.stdout.toString(), loader: "text" };
    });
  },
};

const host = await Bun.build({
  entrypoints: ["extension/src/host/main.ts"],
  outdir: "extension/dist",
  naming: "host.js",
  target: "node",
  format: "cjs",
  external: ["vscode"],
  sourcemap: "linked",
});
const webview = await Bun.build({
  entrypoints: ["extension/src/webview/main.tsx"],
  outdir: "extension/dist",
  naming: "webview.js",
  target: "browser",
  format: "iife",
  plugins: [tailwind],
  define: { "process.env.NODE_ENV": '"production"' },
  sourcemap: "linked",
});
const ompHook = await Bun.build({
  entrypoints: ["extension/src/omp/trama-hook.ts"],
  outdir: "extension/dist",
  naming: "omp-hook.js",
  target: "bun",
  format: "esm",
});

let failed = false;
for (const result of [host, webview, ompHook]) {
  for (const log of result.logs) console.error(String(log));
  failed ||= !result.success;
}
if (failed) process.exit(1);
console.log("built extension/dist/host.js, webview.js and omp-hook.js");
