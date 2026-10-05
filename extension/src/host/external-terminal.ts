import { mkdirSync, readFileSync, readdirSync, unlinkSync, watch, type FSWatcher } from "node:fs";
import { join } from "node:path";
import { TERMINAL_ENV } from "../../../src/core/announcements";
import { QUESTION_ENDPOINT_ENV } from "../../../src/core/question-channel";
import { quote } from "./quote";

/** The folder of `globalStorageUri` where the scripts of the external windows leave their end markers. */
export const MARKER_FOLDER = "external-terminals";

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
 * The runs of the external windows and their markers. Only the marker of the run in progress of a followed terminal
 * counts as the command ending; any other marker is deleted and counts for nothing. The end never comes from waiting
 * for the terminal's process.
 */
export class ExternalRuns<T> {
  private readonly runs = new Map<string, Followed<T>>();
  private readonly last = new Map<string, number>();
  private latest: string | undefined;
  private watcher: FSWatcher | undefined;

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
   * Run `run` of `terminal` (from `nextRun`) begins and is the one that counts. A run still in progress in another
   * terminal is no longer followed: its marker, if it comes, is deleted and counts for nothing.
   *
   * The run is followed from before its window opens, because a command that fails at once leaves its marker before the
   * window is known to be open. Until `commit` its end is held back, so that what must happen when the instruction is
   * sent (ghosts announced, waiting notices taken back) comes before what must happen when the command ends. `commit`
   * is for a window that opened: it delivers the end that was held, if any. `abandon` is for one that failed to open: the
   * run is dropped with any end it held, its number is free again and the run it had displaced is followed again.
   */
  start(terminal: string, run: number, context: T): { commit: () => void; abandon: () => void } {
    const before = {
      latest: this.latest,
      last: this.last.get(terminal),
      own: this.runs.get(terminal),
      displaced: this.latest !== undefined && this.latest !== terminal ? this.runs.get(this.latest) : undefined,
    };
    if (before.displaced !== undefined && this.latest !== undefined) this.runs.delete(this.latest);
    const entry: Followed<T> = { run, context, pending: true };
    this.last.set(terminal, run);
    this.runs.set(terminal, entry);
    this.latest = terminal;
    return {
      commit: () => {
        entry.pending = false;
        if (entry.held === undefined || this.runs.get(terminal) !== entry) return;
        this.runs.delete(terminal);
        this.onEnded(entry.held);
      },
      abandon: () => {
        if (this.runs.get(terminal) !== entry) return; // another run replaced it
        if (before.own === undefined) this.runs.delete(terminal);
        else this.runs.set(terminal, before.own);
        if (before.last === undefined) this.last.delete(terminal);
        else this.last.set(terminal, before.last);
        if (before.displaced !== undefined && before.latest !== undefined) this.runs.set(before.latest, before.displaced);
        this.latest = before.latest;
      },
    };
  }

  /** Whether `terminal` has had a run and none is in progress: its last marker arrived, so its window is free. */
  idle(terminal: string): boolean {
    return this.last.has(terminal) && !this.runs.has(terminal);
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
    const current = this.runs.get(marker.terminal);
    if (current === undefined || current.run !== marker.run) return;
    const end = { terminal: marker.terminal, run: marker.run, exitCode: markerStatus(content), context: current.context };
    if (current.pending) {
      current.held = end;
      return;
    }
    this.runs.delete(marker.terminal);
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
