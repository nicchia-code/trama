import { describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { stalledMessage, watchCommand } from "../scripts/run-tests";

/** A fake test command: a program that runs the script with the same Bun, the way the release workflow runs the suite. */
const fake = (script: string) => [process.execPath, "-e", script];

/** An output sink that keeps what it is given. */
function sink() {
  const chunks: string[] = [];
  return { write: (chunk: string | Uint8Array) => void chunks.push(String(chunk)), text: () => chunks.join("") };
}

const alive = (pid: number) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

describe("scripts/run-tests.ts", () => {
  test("a command silent beyond the limit is stopped with its processes and the last file header is named", async () => {
    const dir = mkdtempSync(join(tmpdir(), "trama-run-tests-"));
    const pidFile = join(dir, "grandchild.pid");
    try {
      const out = sink();
      const err = sink();
      const script = `
        const { spawn } = require("node:child_process");
        const { writeFileSync } = require("node:fs");
        console.log("bun test fake");
        console.log("test/first.test.ts:");
        console.log("(pass) one [1ms]");
        console.log("test/second.test.ts:");
        const child = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], { stdio: "ignore" });
        writeFileSync(process.env.PID_FILE, String(child.pid));
        setInterval(() => {}, 1000);
      `;
      const result = await watchCommand({ command: fake(script), silenceMs: 4000, env: { ...process.env, PID_FILE: pidFile }, stdout: out, stderr: err });

      expect(result).toEqual({ code: 1, stalled: true, file: "test/second.test.ts" });
      expect(out.text()).toContain("(pass) one [1ms]");
      expect(stalledMessage(4000, result.file)).toContain("test/second.test.ts");

      const grandchild = Number(readFileSync(pidFile, "utf8"));
      for (let waited = 0; alive(grandchild) && waited < 10_000; waited += 100) await Bun.sleep(100);
      expect(alive(grandchild)).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 30_000);

  test("a command that goes on printing is not stopped, even when it lasts longer than the limit", async () => {
    const out = sink();
    const script = `
      let n = 0;
      const timer = setInterval(() => { console.log("line " + ++n); if (n === 12) { clearInterval(timer); process.exit(0); } }, 500);
    `;
    const result = await watchCommand({ command: fake(script), silenceMs: 3000, stdout: out, stderr: sink() });
    expect(result).toEqual({ code: 0, stalled: false, file: null });
    expect(out.text()).toContain("line 12");
  }, 30_000);

  test("a command that ends passes its exit code, and its output is repeated", async () => {
    for (const code of [0, 7]) {
      const out = sink();
      const err = sink();
      const script = `console.log("test/done.test.ts:"); console.error("to stderr"); process.exit(${code});`;
      const result = await watchCommand({ command: fake(script), silenceMs: 60_000, stdout: out, stderr: err });
      expect(result).toEqual({ code, stalled: false, file: "test/done.test.ts" });
      expect(out.text()).toContain("test/done.test.ts:");
      expect(err.text()).toContain("to stderr");
    }
  }, 30_000);

  test("the header is read when it arrives in two chunks, with colours or a carriage return", async () => {
    const script = `
      process.stdout.write("\\u001b[1mtest/a.test.ts:\\u001b[0m\\r\\ntest/b.te");
      setTimeout(() => process.stdout.write("st.tsx:\\r\\n(pass) x\\n"), 200);
    `;
    const result = await watchCommand({ command: fake(script), silenceMs: 60_000, stdout: sink(), stderr: sink() });
    expect(result).toEqual({ code: 0, stalled: false, file: "test/b.test.tsx" });
  }, 30_000);

  test("a command that cannot start is an error, not a hang", async () => {
    const dir = mkdtempSync(join(tmpdir(), "trama-run-tests-"));
    try {
      const err = sink();
      const missing = join(dir, "no-such-program");
      expect(existsSync(missing)).toBe(false);
      const result = await watchCommand({ command: [missing], silenceMs: 60_000, stdout: sink(), stderr: err });
      expect(result.code).toBe(1);
      expect(result.stalled).toBe(false);
      expect(err.text()).toContain("Cannot start");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
