// Runs the test suite the way the release workflow does: `bun test --isolate`, with its output read and repeated in the
// log, and stopped when it prints nothing new for 3 minutes, so a hang fails the step and the log names its test file.
//
//   bun run scripts/run-tests.ts [bun test arguments...]
//
// The suite is stopped together with every process it started (a process group on Linux and macOS, `taskkill /T` on
// Windows, where a child does not die with its parent). The file in progress is the last one whose header (`<path>:`
// on a line of its own) the suite printed. The script exits with the suite's own code when the suite ends by itself,
// and with 1 when it stopped it.
import { type ChildProcess, spawn, spawnSync } from "node:child_process";

/** Silence after which the suite is stopped. */
export const SILENCE_LIMIT_MS = 3 * 60 * 1000;

/** The header `bun test` prints before the results of a file: its path, then a colon, alone on the line. */
const FILE_HEADER = /^(\S.*\.(?:test|spec)\.[cm]?[jt]sx?):$/;
const ANSI = /\u001b\[[0-9;]*m/g;

interface Sink {
  write(chunk: string | Uint8Array): unknown;
}

export interface WatchOptions {
  command: string[];
  /** The silence, in milliseconds, after which the command is stopped. */
  silenceMs: number;
  cwd?: string;
  env?: Record<string, string | undefined>;
  stdout?: Sink;
  stderr?: Sink;
}

export interface WatchResult {
  /** The command's exit code, or 1 when it was stopped. */
  code: number;
  stalled: boolean;
  /** The last test file whose header the command printed, null when it printed none. */
  file: string | null;
}

/** Stops a process and every process it started. */
function killTree(child: ChildProcess): void {
  const pid = child.pid;
  if (pid === undefined) return;
  if (process.platform === "win32") {
    const result = spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore" });
    if (result.status !== 0) child.kill("SIGKILL");
    return;
  }
  try {
    process.kill(-pid, "SIGKILL");
  } catch {
    child.kill("SIGKILL");
  }
}

/** Runs the command, repeats its output and stops it, with its processes, after `silenceMs` without a byte of output. */
export function watchCommand(options: WatchOptions): Promise<WatchResult> {
  const [program, ...args] = options.command;
  if (program === undefined) throw new Error("watchCommand needs a command");
  const stdout = options.stdout ?? process.stdout;
  const stderr = options.stderr ?? process.stderr;
  return new Promise((resolve) => {
    const child = spawn(program, args, {
      cwd: options.cwd,
      env: options.env ?? process.env,
      stdio: ["ignore", "pipe", "pipe"],
      // Its own process group on Linux and macOS, so the whole group can be killed. On Windows `detached` opens a console.
      detached: process.platform !== "win32",
    });
    let file: string | null = null;
    let finished = false;
    let timer: ReturnType<typeof setTimeout>;

    const finish = (result: WatchResult) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      resolve(result);
    };
    const arm = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        killTree(child);
        // The pipes may stay open while a stray process holds them: the verdict does not wait for them.
        child.stdout?.destroy();
        child.stderr?.destroy();
        finish({ code: 1, stalled: true, file });
      }, options.silenceMs);
    };

    const follow = (stream: NodeJS.ReadableStream | null, sink: Sink) => {
      let pending = "";
      stream?.setEncoding("utf8");
      stream?.on("data", (chunk: string) => {
        arm();
        sink.write(chunk);
        const lines = (pending + chunk).split("\n");
        pending = lines.pop() ?? "";
        for (const line of lines) {
          const header = FILE_HEADER.exec(line.replace(ANSI, "").trimEnd());
          if (header) file = header[1] ?? file;
        }
      });
    };
    follow(child.stdout, stdout);
    follow(child.stderr, stderr);

    child.on("error", (error) => {
      stderr.write(`Cannot start ${program}: ${error.message}\n`);
      finish({ code: 1, stalled: false, file });
    });
    child.on("close", (code) => finish({ code: code ?? 1, stalled: false, file }));
    arm();
  });
}

/** The message that names the file of a hang. */
export function stalledMessage(silenceMs: number, file: string | null): string {
  const seconds = Math.round(silenceMs / 1000);
  const running = file === null ? "The suite had printed no test file header yet." : `Test file in progress: ${file}`;
  return `\nThe test suite printed nothing for ${seconds} seconds and was stopped, with every process it started.\n${running}\n`;
}

if (import.meta.main) {
  const result = await watchCommand({ command: [process.execPath, "test", "--isolate", ...process.argv.slice(2)], silenceMs: SILENCE_LIMIT_MS });
  if (result.stalled) process.stderr.write(stalledMessage(SILENCE_LIMIT_MS, result.file));
  process.exit(result.code);
}
