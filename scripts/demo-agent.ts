// Prints the `trama.agent` line to put in your USER settings (it has application scope: a workspace value is ignored,
// so a cloned repository cannot choose the program Trama runs). Nothing is written, so nobody has to hand-quote JSON.
//
//   bun run scripts/demo-agent.ts   # prints the omp line: starting omp spends tokens
//
// omp finds `trama` only if dist/ of this repo is on the PATH the editor gives its terminals.

const line = JSON.stringify({ "trama.agent": "omp" });
console.log(`Put this in your user settings (Preferences: Open User Settings (JSON)), then reload the window:\n${line}`);
