import { randomUUID } from "node:crypto";
import { renameSync, rmSync, writeFileSync } from "node:fs";
import { rename, rm, writeFile } from "node:fs/promises";
import { noteWritten } from "./written";

/** What Windows (or Linux, while another process holds the file) answers a rename over an open file with. */
const BUSY_CODES: Record<string, true> = { EPERM: true, EACCES: true, EBUSY: true };

/** Whether an error code is one Windows (or Linux, while another process holds the file) gives for a file in use. */
export const isBusyCode = (code: string | undefined): boolean => code !== undefined && BUSY_CODES[code] === true;

const RETRY_MS = 1000;
const RETRY_STEP_MS = 10;

/** The synchronous writers wait by blocking the thread: they serve the command line, a short process with no editor behind it. */
export function pause(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/** The wait of the asynchronous writers: the thread goes back to the event loop until the time is over. */
export const sleep = (ms: number): Promise<void> => {
  const { promise, resolve } = Promise.withResolvers<void>();
  setTimeout(resolve, ms);
  return promise;
};

function renameRetrying(from: string, to: string): void {
  const deadline = Date.now() + RETRY_MS;
  for (;;) {
    try {
      renameSync(from, to);
      return;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (!isBusyCode(code) || Date.now() >= deadline) throw error;
      pause(RETRY_STEP_MS);
    }
  }
}

async function renameRetryingAsync(from: string, to: string): Promise<void> {
  const deadline = Date.now() + RETRY_MS;
  for (;;) {
    try {
      await rename(from, to);
      return;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (!isBusyCode(code) || Date.now() >= deadline) throw error;
      await sleep(RETRY_STEP_MS);
    }
  }
}

const temporaryOf = (path: string): string => `${path}.${process.pid}.${randomUUID()}.tmp`;

/**
 * Writes `text` through a temporary file renamed over `path`, so a reader never sees half a file. A rename refused
 * with EPERM, EACCES or EBUSY is retried for at most one second; then the error is thrown. The temporary file never
 * stays on disk. The wait between attempts blocks the thread: the editor host uses `writeFileAtomicAsync`.
 */
export function writeFileAtomic(path: string, text: string, options: { mode?: number } = {}): void {
  const temporary = temporaryOf(path);
  try {
    writeFileSync(temporary, text, { mode: options.mode, flag: "wx" });
    renameRetrying(temporary, path);
  } finally {
    rmSync(temporary, { force: true });
  }
  noteWritten(path);
}

/** As `writeFileAtomic`, but every wait between attempts gives the thread back, so the editor host is never held. */
export async function writeFileAtomicAsync(path: string, text: string, options: { mode?: number } = {}): Promise<void> {
  const temporary = temporaryOf(path);
  try {
    await writeFile(temporary, text, { mode: options.mode, flag: "wx" });
    await renameRetryingAsync(temporary, path);
  } finally {
    await rm(temporary, { force: true });
  }
  noteWritten(path);
}
