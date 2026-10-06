import { spawn } from "node:child_process";
import { accessSync, constants, statSync } from "node:fs";
import { basename, delimiter, join } from "node:path";
import { customTerminalCommand, typedCommand } from "./external-terminal";
import { type ExternalWindow, type ReusableTerminal, runScripting } from "./external-reuse";
import { quote } from "./quote";

/** The terminals whose way of running a command in a folder Trama knows; any other program takes the command with `-e`. */
export type TerminalKind = "gnome-terminal" | "konsole" | "xfce4-terminal" | "kitty" | "wezterm" | "alacritty" | "foot" | "xterm" | "terminal-app" | "xdg-terminal-exec" | "other";

export interface DetectedTerminal {
  /** The program to run: a path, or `osascript` for Terminal.app. */
  program: string;
  kind: TerminalKind;
}

/** The terminals in the order they are tried on the PATH, after `TERMINAL`, `xdg-terminal-exec` and `x-terminal-emulator`. */
const KNOWN: readonly TerminalKind[] = ["gnome-terminal", "konsole", "xfce4-terminal", "kitty", "wezterm", "alacritty", "foot", "xterm"];

/** The path of the executable `name` stands for (a path or a name on `pathVariable`), or undefined when there is none. */
export function findProgram(name: string, pathVariable: string | undefined): string | undefined {
  const isExecutable = (path: string): boolean => {
    try {
      if (!statSync(path).isFile()) return false;
      accessSync(path, constants.X_OK);
      return true;
    } catch {
      return false;
    }
  };
  if (name.includes("/")) return isExecutable(name) ? name : undefined;
  for (const folder of (pathVariable ?? "").split(delimiter)) {
    if (folder === "") continue;
    const path = join(folder, name);
    if (isExecutable(path)) return path;
  }
  return undefined;
}

const kindOf = (program: string): TerminalKind => KNOWN.find((kind) => kind === basename(program)) ?? "other";

/**
 * The system terminal Trama opens when `trama.externalTerminalCommand` is empty. Linux: `TERMINAL` when it points to an
 * executable, then `xdg-terminal-exec`, then `x-terminal-emulator`, then the first terminal of the list found on the PATH.
 * macOS: Terminal.app. Anything else has none. A program from `TERMINAL` or `x-terminal-emulator` that is not one of the
 * known terminals gets the command with `-e`.
 */
export function detectTerminal(platform: string, env: Record<string, string | undefined>): DetectedTerminal | undefined {
  if (platform === "darwin") return { program: "osascript", kind: "terminal-app" };
  if (platform !== "linux") return undefined;
  const fromEnv = env["TERMINAL"]?.trim();
  const chosen = fromEnv === undefined || fromEnv === "" ? undefined : findProgram(fromEnv, env["PATH"]);
  if (chosen !== undefined) return { program: chosen, kind: kindOf(chosen) };
  const xdg = findProgram("xdg-terminal-exec", env["PATH"]);
  if (xdg !== undefined) return { program: xdg, kind: "xdg-terminal-exec" };
  const alternatives = findProgram("x-terminal-emulator", env["PATH"]);
  if (alternatives !== undefined) return { program: alternatives, kind: "other" };
  for (const kind of KNOWN) {
    const program = findProgram(kind, env["PATH"]);
    if (program !== undefined) return { program, kind };
  }
  return undefined;
}

/** The terminal's kind when Trama can write into a window of it again later, undefined for every other. */
export function reusableKind(terminal: DetectedTerminal | undefined): ReusableTerminal | undefined {
  return terminal?.kind === "terminal-app" || terminal?.kind === "kitty" || terminal?.kind === "wezterm" ? terminal.kind : undefined;
}

export interface WindowRequest {
  /** The POSIX script to run, from `externalScript`. */
  script: string;
  /** The project folder. */
  cwd: string;
  title: string;
  /** Where kitty listens for Trama's remote control of this window. */
  kittySocket: string;
}

/** The program and arguments that open a window of `terminal` running the script in the project folder, with the window's title where the terminal takes one. */
export function terminalCommand(terminal: DetectedTerminal, request: WindowRequest): { program: string; args: string[] } {
  const { script, cwd, title, kittySocket } = request;
  const run = ["sh", "-c", script];
  const { program } = terminal;
  switch (terminal.kind) {
    case "gnome-terminal":
      return { program, args: [`--title=${title}`, `--working-directory=${cwd}`, "--", ...run] };
    case "konsole":
      return { program, args: ["--workdir", cwd, "-p", `tabtitle=${title}`, "-e", ...run] };
    case "xfce4-terminal":
      return { program, args: [`--title=${title}`, `--working-directory=${cwd}`, "-x", ...run] };
    case "kitty":
      return { program, args: ["--title", title, "--directory", cwd, "-o", "allow_remote_control=socket-only", "--listen-on", `unix:${kittySocket}`, ...run] };
    case "wezterm":
      return { program, args: ["start", "--cwd", cwd, "--", "sh", "-c", weztermTitled(program, title, script)] };
    case "alacritty":
      return { program, args: ["--title", title, "--working-directory", cwd, "-e", ...run] };
    case "foot":
      return { program, args: [`--title=${title}`, `--working-directory=${cwd}`, ...run] };
    case "xterm":
      return { program, args: ["-T", title, "-e", ...run] };
    case "xdg-terminal-exec":
      return { program, args: run };
    case "terminal-app":
    case "other":
      return { program, args: ["-e", ...run] };
  }
}

/**
 * `script` preceded by naming its WezTerm tab and window `title`: WezTerm takes no title when it opens a window, so the
 * window names itself once through `wezterm cli`, which finds it from `WEZTERM_PANE`. A WezTerm without these commands
 * leaves it unnamed and runs the script all the same.
 */
function weztermTitled(program: string, title: string, script: string): string {
  const cli = `${quote("posix", program)} cli`;
  const name = quote("posix", title);
  return `${cli} set-tab-title ${name} 2>/dev/null; ${cli} set-window-title ${name} 2>/dev/null; ${script}`;
}

/** How long a terminal that has started may take to fail before it counts as running. */
export const START_GRACE_MS = 500;

/**
 * Starts `program` detached, so it outlives the editor window and never blocks it, in `cwd`. Resolves once it has started and
 * did not fail at once. Rejects with the system's error when it does not start, and with "the terminal could not be started"
 * when it ends with an error within `graceMs`.
 */
export function startDetached(program: string, args: string[], cwd: string, graceMs = START_GRACE_MS): Promise<void> {
  const { promise, resolve, reject } = Promise.withResolvers<void>();
  const child = spawn(program, args, { cwd, detached: true, stdio: "ignore" });
  let timer: NodeJS.Timeout | undefined;
  child.on("error", (err) => {
    clearTimeout(timer);
    reject(err);
  });
  child.on("spawn", () => {
    timer = setTimeout(resolve, graceMs);
  });
  child.on("exit", (code) => {
    clearTimeout(timer);
    if (code === 0) resolve();
    else reject(new Error("the terminal could not be started"));
  });
  child.unref();
  return promise;
}

/** The AppleScript that opens a new Terminal.app window running the line it is given (item 1), titles it (item 2) and prints its id. */
const TERMINAL_APP_SCRIPT = [
  "on run argv",
  'tell application "Terminal"',
  "activate",
  "do script (item 1 of argv)",
  "try",
  "set custom title of selected tab of front window to (item 2 of argv)",
  "end try",
  "return id of front window",
  "end tell",
  "end run",
];

export interface WindowOrigin {
  /** `trama.externalTerminalCommand`: when not empty, the window is opened by it instead of a detected terminal. */
  custom: string;
  /** The detected terminal, when `custom` is empty. */
  terminal: DetectedTerminal | undefined;
}

/**
 * Opens a new window running `request.script` in the project folder, through the developer's own terminal command or the
 * detected terminal. Returns how to reach the window again when its terminal allows it (kitty, WezTerm and Terminal.app),
 * undefined otherwise. Rejects with the reason it could not be opened.
 */
export async function openWindow(origin: WindowOrigin, request: WindowRequest): Promise<ExternalWindow | undefined> {
  if (origin.custom !== "") {
    await startDetached("sh", ["-c", customTerminalCommand(origin.custom, request.script)], request.cwd);
    return undefined;
  }
  const terminal = origin.terminal;
  if (terminal === undefined) throw new Error("no terminal was found; set trama.externalTerminalCommand");
  if (terminal.kind === "terminal-app") {
    // `do script` types the line into the window's own shell, which may not be POSIX: `sh -c` makes it run the same anywhere.
    const line = typedCommand(`cd ${quote("posix", request.cwd)} && ${request.script}`);
    const id = await runScripting({ program: terminal.program, args: [...TERMINAL_APP_SCRIPT.flatMap((text) => ["-e", text]), line, request.title] });
    const windowId = Number.parseInt(id.trim(), 10);
    return Number.isNaN(windowId) ? undefined : { terminal: "terminal-app", windowId };
  }
  if (terminal.kind === "wezterm") {
    // Asking the running WezTerm for a window prints the id of its pane, which is how the window is reached again.
    try {
      const id = await runScripting({ program: terminal.program, args: ["cli", "spawn", "--new-window", "--cwd", request.cwd, "--", "sh", "-c", weztermTitled(terminal.program, request.title, request.script)] });
      const paneId = Number.parseInt(id.trim(), 10);
      if (!Number.isNaN(paneId)) return { terminal: "wezterm", paneId };
    } catch {
      // No WezTerm is running to ask: start one, which cannot be reached again.
    }
  }
  const { program, args } = terminalCommand(terminal, request);
  await startDetached(program, args, request.cwd);
  return terminal.kind === "kitty" ? { terminal: "kitty", address: `unix:${request.kittySocket}`, windowId: 1 } : undefined;
}
