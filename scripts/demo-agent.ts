// Sets `trama.agentCommand` in the demo project's .vscode/settings.json, so nobody has to hand-quote JSON.
//
//   bun run scripts/demo-agent.ts echo   # the "agent" prints its prompt: free, nothing else happens
//   bun run scripts/demo-agent.ts path   # prints which `trama` the agent would find, then the prompt: free
//   bun run scripts/demo-agent.ts omp    # starts omp with this repo's dist/ first on PATH: spends tokens
//
// The project is TRAMA_DEMO_DIR, or /tmp/trama-demo/shop. Other keys already in the file are kept.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const DIST = resolve(import.meta.dir, "../dist");
const MODES: Record<string, string> = {
  echo: "echo {prompt}",
  path: `PATH=${DIST}:$PATH sh -c 'command -v trama; echo $0' {prompt}`,
  omp: `PATH=${DIST}:$PATH omp {prompt}`,
};

const mode = process.argv[2] ?? "";
const command = MODES[mode];
if (!command) {
  console.error(`Usage: bun run scripts/demo-agent.ts <${Object.keys(MODES).join("|")}>`);
  process.exit(2);
}

const dir = process.env["TRAMA_DEMO_DIR"] ?? "/tmp/trama-demo/shop";
const file = join(dir, ".vscode", "settings.json");
mkdirSync(join(dir, ".vscode"), { recursive: true });
const settings: Record<string, unknown> = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};
settings["trama.agentCommand"] = command;
writeFileSync(file, `${JSON.stringify(settings, null, 2)}\n`);
console.log(`${mode}: ${command}\n-> ${file}`);
