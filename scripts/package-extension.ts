// Builds one platform-specific .vsix per target, each with the matching `trama` binary in extension/bin/:
//
//   bun run scripts/package-extension.ts                 # the current platform
//   bun run scripts/package-extension.ts darwin-arm64 linux-x64
//
// Output: dist/trama-<target>-<version>.vsix. macOS binaries are signed ad hoc only when packaging on a Mac; release
// builds for macOS come from the macOS runner in .github/workflows/release.yml.
import { chmodSync, copyFileSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { $ } from "bun";

const TARGETS: Record<string, string> = {
  "linux-x64": "bun-linux-x64",
  "linux-arm64": "bun-linux-arm64",
  "darwin-arm64": "bun-darwin-arm64",
  "darwin-x64": "bun-darwin-x64",
};

const here = `${process.platform}-${process.arch}`;
const targets = process.argv.slice(2).length > 0 ? process.argv.slice(2) : [here];
for (const t of targets) if (!TARGETS[t]) throw new Error(`Unknown target "${t}" (known: ${Object.keys(TARGETS).join(", ")})`);

const version: string = JSON.parse(readFileSync("extension/package.json", "utf8")).version;
mkdirSync("dist", { recursive: true });
await $`bun run scripts/build-extension.ts`;
copyFileSync("LICENSE", "extension/LICENSE");

for (const target of targets) {
  rmSync("extension/bin", { recursive: true, force: true });
  mkdirSync("extension/bin");
  await $`bun build --compile --target=${TARGETS[target]} src/cli/bin.ts --outfile extension/bin/trama`.quiet();
  chmodSync("extension/bin/trama", 0o755);
  // Bun appends the app to its runtime after the runtime was signed, which leaves an invalid signature that macOS may
  // refuse to run. Re-signing ad hoc needs codesign, so it only happens when packaging on a Mac.
  if (target.startsWith("darwin") && process.platform === "darwin") await $`codesign --force --sign - extension/bin/trama`;
  const out = `../dist/trama-${target}-${version}.vsix`;
  await $`bunx @vscode/vsce package --target ${target} --no-dependencies --allow-missing-repository -o ${out}`.cwd("extension");
  console.log(`packaged dist/trama-${target}-${version}.vsix`);
}
rmSync("extension/bin", { recursive: true, force: true });
rmSync("extension/LICENSE", { force: true });
