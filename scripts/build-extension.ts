// Bundles the extension host (Node, CommonJS) and the webview (browser) into extension/dist/, after writing the
// tool declarations VS Code needs (`contributes.languageModelTools`) from the shared tool catalog.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { TOOLS } from "../src/tools/catalog";

mkdirSync("extension/dist", { recursive: true });

const manifestPath = "extension/package.json";
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
manifest.contributes.languageModelTools = TOOLS.map((t) => ({
  name: t.name,
  displayName: `Trama: ${t.title}`,
  toolReferenceName: t.name,
  canBeReferencedInPrompt: true,
  userDescription: t.title,
  modelDescription: t.description,
  icon: "$(type-hierarchy)",
  tags: ["trama"],
  inputSchema: t.inputSchema,
}));
const updated = `${JSON.stringify(manifest, null, 2)}\n`;
if (updated !== readFileSync(manifestPath, "utf8")) writeFileSync(manifestPath, updated);

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

let failed = false;
for (const result of [host, webview]) {
  for (const log of result.logs) console.error(String(log));
  failed ||= !result.success;
}
if (failed) process.exit(1);
console.log("built extension/dist/host.js and extension/dist/webview.js");
