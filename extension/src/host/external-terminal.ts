import { mkdirSync, readFileSync, readdirSync, rmSync, statSync, unlinkSync, utimesSync, watch, type FSWatcher } from "node:fs";
import { join } from "node:path";
import { TERMINAL_ENV } from "../../../src/core/announcements";
import { QUESTION_ENDPOINT_ENV } from "../../../src/core/question-channel";
import { quote } from "./quote";

/** The folder of `globalStorageUri` where the scripts of the external windows leave their end markers. */
export const MARKER_FOLDER = "external-terminals";

const HEARTBEAT_MS = 60 * 60 * 1000;
const ORPHAN_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * The marker folder of the editor window `id` inside `root` (`external-terminals/` of the global storage): each window has
 * its own, so no window reads, deletes or clears what another window's runs leave there (end markers, kitty sockets).
 * Creates it, and deletes what in `root` no window has touched for a week: folders of closed sessions, and the loose files
 * earlier versions left.
 */
export function windowMarkerDir(root: string, id: string, now = Date.now()): string {
  mkdirSync(root, { recursive: true });
  for (const name of readdirSync(root)) {
    try {
      if (name !== id && now - statSync(join(root, name)).mtimeMs > ORPHAN_MS) rmSync(join(root, name), { recursive: true, force: true });
    } catch {
      // already gone
    }
  }
  const dir = join(root, id);
  mkdirSync(dir, { recursive: true });
  return dir;
}

/** The name of the marker of run `run` of terminal `terminal`. */
export const markerName = (terminal: string, run: number): string => `${terminal}-${run}.end`;

const MARKER_PATTERN = /^([a-z0-9]+)-(\d+)\.end$/;

/** The terminal and the run a marker file name is for, or undefined when the name is not a marker's. */
export function parseMarkerName(name: string): { terminal: string; run: number } | undefined {
  const match = MARKER_PATTERN.exec(name);
  return match === null ? undefined : { terminal: match[1] as string, run: Number(match[2]) };
}

/**
 * The script a POSIX shell runs in an external window: sets `TRAMA_AGENT`, the terminal's identity, the address of the
 * editor window that opened it (when its question channel is up, so the agent's questions count as asked from a Trama
 * terminal) and the PATH with the folder of the bundled `trama` first, runs `agentLine`, writes the marker with the exit
 * status only (under a temporary name, then renamed, so it is never read half written) and leaves the window open in
 * the developer's login shell. The instruction is only inside `agentLine`, quoted by the caller; the marker never carries it.
 */
export function externalScript(options: { agentLine: string; terminal: string; marker: string; binDir?: string; endpoint?: string }): string {
  const q = (text: string) => quote("posix", text);
  const path = options.binDir === undefined ? `PATH="$PATH"` : `PATH=${q(options.binDir)}:"$PATH"`;
  const endpoint = options.endpoint === undefined ? "" : ` ${QUESTION_ENDPOINT_ENV}=${q(options.endpoint)}`;
  const temporary = `${options.marker}.tmp`;
  return [
    `export TRAMA_AGENT=1 ${TERMINAL_ENV}=${q(options.terminal)}${endpoint} ${path}`,
    options.agentLine.trim(),
    "trama_status=$?",
    `printf '%s\\n' "$trama_status" > ${q(temporary)} && mv ${q(temporary)} ${q(options.marker)}`,
    `exec "\${SHELL:-/bin/sh}" -l`,
  ].join("; ");
}

/**
 * `script` as words that run it in `sh` whatever shell reads them: `sh -c '<script>'`. For a terminal that takes a program
 * and its arguments, for a line typed into a window whose shell may not be POSIX (fish, for one) and for `do script`.
 */
export const typedCommand = (script: string): string => `sh -c ${quote("posix", script)}`;

/**
 * The shell command that opens the developer's own terminal (`trama.externalTerminalCommand`) on `script`, to be run by
 * a POSIX shell in the project folder. `{command}` becomes `sh -c '<script>'`: the script stays one argument for `sh`, but
 * for the terminal it is a program with its arguments, which is what terminals want after `-e` or `--`
 * (`alacritty -e {command}`). Without `{command}` the words go at the end.
 */
export function customTerminalCommand(template: string, script: string): string {
  const command = typedCommand(script);
  const text = template.trim();
  return text.includes("{command}") ? text.split("{command}").join(command) : `${text} ${command}`;
}

/** The exit status a marker holds, or undefined when its content is not one. */
export function markerStatus(content: string): number | undefined {
  const text = content.trim();
  return /^\d+$/.test(text) ? Number(text) : undefined;
}

/** A run of an external window that ended: its terminal, its number, the command's exit status and what the run was started with. */
export interface ExternalEnd<T> {
  terminal: string;
  run: number;
  exitCode: number | undefined;
  context: T;
}

/** A run being followed. `pending` while its window is still opening, when an end that arrives is kept in `held`. */
interface Followed<T> {
  run: number;
  context: T;
  pending: boolean;
  held?: ExternalEnd<T>;
}

/**
 * The runs of the external windows and their markers. The marker of each terminal's current run counts as the
 * command ending (`onEnded`), even after another terminal starts work. Any other marker is deleted and counts
 * for nothing. The end never comes from waiting for the terminal's process.
 */
export class ExternalRuns<T> {
  private readonly runs = new Map<string, Followed<T>>();
  /** Attempts collect their own markers without replacing the successfully sent instruction. */
  private readonly attempts = new Map<string, Followed<T>>();
  private readonly last = new Map<string, number>();
  private watcher: FSWatcher | undefined;
  private readonly beat: NodeJS.Timeout;

  /**
   * `dir` is the marker folder. Markers left in it by an earlier session are deleted without effect, and it is
   * watched until `dispose`.
   */
  constructor(
    private readonly dir: string,
    private readonly onEnded: (end: ExternalEnd<T>) => void,
  ) {
    mkdirSync(dir, { recursive: true });
    for (const name of readdirSync(dir)) this.discard(name);
    // The folder's modification time says the window is alive, so another window's sweep (`windowMarkerDir`) keeps it.
    this.beat = setInterval(() => {
      try {
        const now = new Date();
        utimesSync(dir, now, now);
      } catch {
        // folder gone: nothing to keep alive
      }
    }, HEARTBEAT_MS);
    this.beat.unref();
    this.watcher = watch(dir, () => this.scan());
    // A watcher that fails (the folder removed, no handles left) must not take the editor down: markers are then read on the next event.
    this.watcher.on("error", () => undefined);
  }

  /** Where the script of run `run` of `terminal` writes its marker. */
  markerPath(terminal: string, run: number): string {
    return join(this.dir, markerName(terminal, run));
  }

  /** The number the next run of `terminal` has. */
  nextRun(terminal: string): number {
    return (this.last.get(terminal) ?? 0) + 1;
  }

  /**
   * Prepare run `run` of `terminal` (from `nextRun`) before opening its window. Its end is held until `commit`,
   * so instruction-sent effects happen first. The current run stays followed throughout the attempt.
   * Only `commit`, after the instruction was sent, replaces it; `abandon` drops the attempt and its held end.
   */
  start(terminal: string, run: number, context: T): { commit: () => void; abandon: () => void } {
    const last = this.last.get(terminal);
    const entry: Followed<T> = { run, context, pending: true };
    this.last.set(terminal, run);
    this.attempts.set(terminal, entry);
    return {
      commit: () => {
        if (this.attempts.get(terminal) !== entry) return;
        this.attempts.delete(terminal);
        entry.pending = false;
        this.runs.set(terminal, entry);
        if (entry.held !== undefined) {
          this.runs.delete(terminal);
          this.onEnded(entry.held);
        }
      },
      abandon: () => {
        if (this.attempts.get(terminal) !== entry) return;
        this.attempts.delete(terminal);
        if (last === undefined) this.last.delete(terminal);
        else this.last.set(terminal, last);
      },
    };
  }


  /** Whether `terminal` has had a run and none is in progress: its last marker arrived, so its window is free. */
  idle(terminal: string): boolean {
    return this.last.has(terminal) && !this.runs.has(terminal) && !this.attempts.has(terminal);
  }

  /** Reads every marker in the folder. */
  scan(): void {
    let names: string[];
    try {
      names = readdirSync(this.dir);
    } catch {
      return;
    }
    for (const name of names) this.take(name);
  }

  dispose(): void {
    this.watcher?.close();
    this.watcher = undefined;
    clearInterval(this.beat);
  }

  private take(name: string): void {
    const marker = parseMarkerName(name);
    if (marker === undefined) return;
    const file = join(this.dir, name);
    let content: string;
    try {
      content = readFileSync(file, "utf8");
    } catch {
      return; // gone already (taken by an earlier event) or not readable yet
    }
    this.discard(name);
    const pending = this.attempts.get(marker.terminal)?.run === marker.run;
    const runs = pending ? this.attempts : this.runs;
    const current = runs.get(marker.terminal);
    if (current === undefined || current.run !== marker.run) return;
    const end = { terminal: marker.terminal, run: marker.run, exitCode: markerStatus(content), context: current.context };
    if (current.pending) {
      current.held = end;
      return;
    }
    runs.delete(marker.terminal);
    this.onEnded(end);
  }

  private discard(name: string): void {
    try {
      unlinkSync(join(this.dir, name));
    } catch {
      // already deleted
    }
  }
}
