import { spawn } from "node:child_process";

/** The system terminals whose scripting Trama knows how to use to write into a window it opened before. */
export type ReusableTerminal = "terminal-app" | "kitty" | "wezterm";

/** What Trama remembers of a window it opened: enough for the terminal's own scripting to reach it again. */
export type ExternalWindow =
  | { terminal: "terminal-app"; windowId: number }
  /** `address` is the socket of the kitty instance Trama started for it (`unix:<path>`), `windowId` the window inside it. */
  | { terminal: "kitty"; address: string; windowId: number }
  | { terminal: "wezterm"; paneId: number };

/** A program to run and the text it reads on its standard input, if any. */
export interface ScriptingCommand {
  program: string;
  args: string[];
  input?: string;
}

/** How long the terminal's scripting may take before the reuse counts as failed. */
export const SCRIPTING_TIMEOUT_MS = 10_000;

/**
 * The command that writes `line` into `window` and runs it, as the developer typing it would.
 * Terminal.app: AppleScript `do script … in` the window's tab; the line and the window id are passed as the script's
 * arguments, so they are never spliced into the AppleScript text. kitty and WezTerm: `send-text`, with the line on
 * standard input so it is sent as it is, with no escape sequences read in it.
 */
export function scriptingCommand(window: ExternalWindow, line: string): ScriptingCommand {
  switch (window.terminal) {
    case "terminal-app":
      return {
        program: "osascript",
        args: [
          "-e",
          "on run argv",
          "-e",
          'tell application "Terminal" to do script (item 1 of argv) in (tab 1 of window id ((item 2 of argv) as integer))',
          "-e",
          "end run",
          line,
          String(window.windowId),
        ],
      };
    case "kitty":
      return { program: "kitten", args: ["@", "--to", window.address, "send-text", "--match", `id:${window.windowId}`, "--stdin"], input: `${line}\r` };
    case "wezterm":
      return { program: "wezterm", args: ["cli", "send-text", "--pane-id", String(window.paneId), "--no-paste"], input: `${line}\r` };
  }
}

/**
 * Runs the scripting command without blocking the editor. Resolves with what it printed when it ends without error;
 * rejects with an `Error` whose message is the one the scripting gave (its standard error, or the system's error when
 * it did not start).
 */
export function runScripting(command: ScriptingCommand, timeoutMs = SCRIPTING_TIMEOUT_MS): Promise<string> {
  const { promise, resolve, reject } = Promise.withResolvers<string>();
  const child = spawn(command.program, command.args, { stdio: ["pipe", "pipe", "pipe"] });
  let stdout = "";
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk: string) => {
    stdout += chunk;
  });
  let stderr = "";
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk: string) => {
    stderr += chunk;
  });
  const timer = setTimeout(() => {
    child.kill();
    reject(new Error(`the terminal did not answer within ${timeoutMs / 1000} seconds`));
  }, timeoutMs);
  child.on("error", (err) => {
    clearTimeout(timer);
    reject(err);
  });
  child.on("close", (code, signal) => {
    clearTimeout(timer);
    if (code === 0) resolve(stdout);
    else reject(new Error(stderr.trim() || `${command.program} ended with ${signal ?? `status ${code}`}`));
  });
  // A program that ends before reading its input must not take the editor down with a broken pipe.
  child.stdin.on("error", () => undefined);
  child.stdin.end(command.input);
  return promise;
}
