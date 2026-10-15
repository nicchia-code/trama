import { randomUUID } from "node:crypto";
import { renameSync, rmSync, writeFileSync } from "node:fs";

/** What Windows (or Linux, while another process holds the file) answers a rename over an open file with. */
const BUSY_CODES: Record<string, true> = { EPERM: true, EACCES: true, EBUSY: true };
const RETRY_MS = 1000;
const RETRY_STEP_MS = 10;

/** The writers are synchronous, so the wait blocks the thread instead of yielding to an event loop. */
export function pause(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function renameRetrying(from: string, to: string): void {
  const deadline = Date.now() + RETRY_MS;
  for (;;) {
    try {
      renameSync(from, to);
      return;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === undefined || BUSY_CODES[code] !== true || Date.now() >= deadline) throw error;
      pause(RETRY_STEP_MS);
    }
  }
}

/**
 * Writes `text` through a temporary file renamed over `path`, so a reader never sees half a file. A rename refused
 * with EPERM, EACCES or EBUSY is retried for at most one second; then the error is thrown. The temporary file never
 * stays on disk.
 */
export function writeFileAtomic(path: string, text: string, options: { mode?: number } = {}): void {
  const temporary = `${path}.${process.pid}.${randomUUID()}.tmp`;
  try {
    writeFileSync(temporary, text, { mode: options.mode, flag: "wx" });
    renameRetrying(temporary, path);
  } finally {
    rmSync(temporary, { force: true });
  }
}
