// Prints the `trama.agentCommand` line to put in your USER settings (it has application scope: a workspace value is ignored,
// so a cloned repository cannot choose the program Trama runs). Nothing is written, so nobody has to hand-quote JSON.
//
//   bun run scripts/demo-agent.ts echo   # the "agent" prints its prompt: free, nothing else happens
//   bun run scripts/demo-agent.ts path   # prints which `trama` the agent would find, then the prompt: free
//   bun run scripts/demo-agent.ts omp    # starts omp with this repo's dist/ first on PATH: spends tokens
import { resolve } from "node:path";

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

console.log(`Put this in your user settings (Preferences: Open User Settings (JSON)), then reload the window:\n${JSON.stringify({ "trama.agentCommand": command })}`);
