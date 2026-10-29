import { AsyncLocalStorage } from "node:async_hooks";

/**
 * The editor host's diagnostics (`quality#General`): every operation the host runs is measured, and the ones that take longer than `SLOW_MS` write one line to the sink
 * (the Output channel `Trama Performance`), with what started it, what it did, how long it took and each process it started with its own duration. Faster operations write
 * nothing. A line holds only names of operations, paths under `.trama/`, names of programs and durations: never content of files, prompts, answers or settings. Writing a line
 * starts no process and reads no file.
 */
export const SLOW_MS = 200;

/** What started an operation. */
export type Trigger = "file change" | "panel" | "view" | "launch" | "timer" | "editor";

interface Operation {
  trigger: Trigger;
  name: string;
  started: number;
  /** The processes the operation started that already ended, in the order they ended. */
  processes: { program: string; ms: number }[];
  ended: boolean;
}

const current = new AsyncLocalStorage<Operation>();
let sink: ((line: string) => void) | undefined;

/** Where the lines go: `undefined` (the default) measures nothing. */
export function setPerformanceSink(write: ((line: string) => void) | undefined): void {
  sink = write;
}

const pad = (n: number, width = 2) => String(n).padStart(width, "0");

function timeOf(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
}

/** The line of an operation: when it ended, what started it, what it did, its duration and its processes. */
export function performanceLine(ended: Date, trigger: Trigger, name: string, ms: number, processes: readonly { program: string; ms: number }[]): string {
  const started = processes.length === 0 ? "" : ` | processes: ${processes.map((p) => `${p.program} ${Math.round(p.ms)} ms`).join(", ")}`;
  return `${timeOf(ended)} ${trigger} | ${name} | ${Math.round(ms)} ms${started}`;
}

function finish(operation: Operation): void {
  operation.ended = true;
  const ms = Date.now() - operation.started;
  if (ms > SLOW_MS) sink?.(performanceLine(new Date(), operation.trigger, operation.name, ms, operation.processes));
}

/**
 * Runs `fn` as the operation `name` started by `trigger`, and measures it until it ends (a promise it returns is waited for). Inside another operation still running it is
 * part of that one: the processes it starts count for the outer operation. `name` is a name of an operation, a message type or a path under `.trama/`: never content.
 */
export function measured<T>(trigger: Trigger, name: string, fn: () => T): T {
  if (sink === undefined) return fn();
  const outer = current.getStore();
  if (outer !== undefined && !outer.ended) return fn();
  const operation: Operation = { trigger, name, started: Date.now(), processes: [], ended: false };
  let result: T;
  try {
    result = current.run(operation, fn);
  } catch (error) {
    finish(operation);
    throw error;
  }
  if (result instanceof Promise) {
    const done = () => finish(operation);
    result.then(done, done);
  } else {
    finish(operation);
  }
  return result;
}

/** `listener` as an operation: what a watcher, an event of the editor or a message of a view calls, measured as `measured` does. `name` may depend on the arguments. */
export function measuring<A extends unknown[], R>(trigger: Trigger, name: string | ((...args: A) => string), listener: (...args: A) => R): (...args: A) => R {
  return (...args) => measured(trigger, typeof name === "string" ? name : name(...args), () => listener(...args));
}

/**
 * A process is about to start: the returned function says it ended, and the time it took goes to the operation in progress. A process that ends after its operation
 * did, and took longer than `SLOW_MS` by itself, gets a line of its own.
 */
export function processStarted(path: string): () => void {
  const operation = current.getStore();
  if (sink === undefined || operation === undefined) return () => {};
  // Only the name of the program: the folder it lives in is not for the channel.
  const program = path.replace(/^.*[\\/]/, "").replace(/\.(exe|cmd)$/i, "");
  const started = Date.now();
  return () => {
    const ms = Date.now() - started;
    if (!operation.ended) operation.processes.push({ program, ms });
    else if (ms > SLOW_MS) sink?.(performanceLine(new Date(), operation.trigger, `${operation.name} (later)`, ms, [{ program, ms }]));
  };
}

/** The part of a path from `.trama` on, or `(outside .trama)`: the only form in which a path may reach the channel. */
export function tramaPath(path: string): string {
  const match = /(?:^|[\\/])(\.trama(?:[\\/].*)?)$/.exec(path);
  return match?.[1]?.replace(/\\/g, "/") ?? "(outside .trama)";
}
