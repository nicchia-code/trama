import { rmSync } from "node:fs";

/** The codes Windows gives while another process (a `git` the host started and has not seen end) still has a file or its working folder in the tree. */
const BUSY = new Set(["EBUSY", "EPERM", "ENOTEMPTY"]);

/**
 * Removes `path` and everything in it, waiting up to `timeoutMs` for a process that still holds it: on Windows a folder cannot be removed while a process runs in it,
 * and a host test may end while work it started in the background (reading git's directories, the origin, Solo mode) is still finishing.
 */
export async function removeTree(path: string, timeoutMs = 10_000): Promise<void> {
  const until = Date.now() + timeoutMs;
  for (;;) {
    try {
      rmSync(path, { recursive: true, force: true });
      return;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === undefined || !BUSY.has(code) || Date.now() >= until) throw err;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}
