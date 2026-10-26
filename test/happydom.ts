// Preload of every `bun test` run (bunfig.toml): registers happy-dom as the global DOM of the webview component tests,
// and clears the environment variables of the shell that runs the suite which change what the code under test does:
// Trama's own (`TRAMA_*`, inherited by every agent launched by Trama) and `BUN_INSTALL`. A test that needs one of them
// sets it itself and restores the previous value when it ends.
import { GlobalRegistrator } from "@happy-dom/global-registrator";

for (const name of Object.keys(process.env)) {
  const upper = name.toUpperCase(); // Windows environment names are case-insensitive
  if (upper.startsWith("TRAMA_") || upper === "BUN_INSTALL") delete process.env[name];
}

GlobalRegistrator.register();
