// Bundles the extension host (Node, CommonJS), the webview (browser) and the hook omp loads (Bun, ESM) into extension/dist/.
import { mkdirSync } from "node:fs";

mkdirSync("extension/dist", { recursive: true });

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
  entrypoints: ["extension/src/webview/main.ts"],
  outdir: "extension/dist",
  naming: "webview.js",
  target: "browser",
  format: "iife",
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
