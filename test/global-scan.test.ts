import { afterEach, expect, mock, test, vi } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { announce, finishCheck, withdrawAll } from "../src/core/announcements";
import { readLastScan, writeLastScan } from "../src/core/last-scan";
import { projectAt } from "../src/core/store";

const errors: string[] = [];
mock.module("vscode", () => ({
  Disposable: class { constructor(readonly dispose: () => void) {} },
  env: { appName: "Visual Studio Code" },
  extensions: { getExtension: () => undefined },
  window: { showErrorMessage: (message: string) => void errors.push(message) },
}));

const root = mkdtempSync(join(tmpdir(), "trama-global-scan-"));
const p = projectAt(root);
mkdirSync(p.dir, { recursive: true });
const OLD = "2020-01-01T00:00:00.000Z";
afterEach(() => {
  rmSync(root, { recursive: true, force: true });
  mkdirSync(p.dir, { recursive: true });
});

// The extension host imports vscode; load it only after the mock is installed above.
test("only delivers a matching System check from the button launch's destination", async () => {
  const { rememberGlobalScan, watchGlobalScans } = await import("../extension/src/host/global-scan");
  vi.useFakeTimers();
  const watch = watchGlobalScans(() => root);
  try {
    writeLastScan(p, OLD);
    const startedAt = Date.now();
    rememberGlobalScan(root, startedAt, { terminal: "abc123" });
    announce(p, { kind: "check", title: "Scan of Feature A", phase: "scanning", terminal: "abc123" });
    announce(p, { kind: "check", title: "Scan of the System", phase: "scanning", terminal: "wrong1" });
    vi.advanceTimersByTime(200);
    expect(readLastScan(p)).toBe(OLD);

    const check = announce(p, { kind: "check", title: "Scan of the System", phase: "scanning", terminal: "abc123" });
    vi.advanceTimersByTime(200);
    finishCheck(p, check.id);
    vi.advanceTimersByTime(200);
    expect(readLastScan(p)).toBe(new Date(startedAt).toISOString());
    writeLastScan(p, OLD);
    const fastStartedAt = Date.now();
    rememberGlobalScan(root, fastStartedAt, { terminal: "def456" });
    const fast = announce(p, { kind: "check", title: "Scan of the System", phase: "scanning", terminal: "def456" });
    finishCheck(p, fast.id);
    const { forgetGlobalScansForTerminal } = await import("../extension/src/host/global-scan");
    forgetGlobalScansForTerminal("def456");
    expect(readLastScan(p)).toBe(new Date(fastStartedAt).toISOString());
    expect(errors).toEqual([]);
  } finally {
    watch.dispose();
    vi.useRealTimers();
  }
});

test("withdrawn checks and scans ending without delivery leave the timestamp alone", async () => {
  const { forgetGlobalScansForTerminal, forgetWithdrawnGlobalScan, rememberGlobalScan, watchGlobalScans } = await import("../extension/src/host/global-scan");
  vi.useFakeTimers();
  const watch = watchGlobalScans(() => root);
  try {
    writeLastScan(p, OLD);
    const startedAt = Date.now();
    rememberGlobalScan(root, startedAt, { terminal: "abc123" });
    const withdrawn = announce(p, { kind: "check", title: "Scan of the System", phase: "scanning", terminal: "abc123" });
    vi.advanceTimersByTime(200);
    forgetWithdrawnGlobalScan(root, withdrawn);
    withdrawAll(p, [withdrawn.id]);
    vi.advanceTimersByTime(200);
    expect(readLastScan(p)).toBe(OLD);

    rememberGlobalScan(root, Date.now(), { terminal: "abc123" });
    forgetGlobalScansForTerminal("abc123");
    vi.advanceTimersByTime(400);
    expect(readLastScan(p)).toBe(OLD);
  } finally {
    watch.dispose();
    vi.useRealTimers();
  }
});

test("a Copilot button launch matches its editor-chat check", async () => {
  const { rememberGlobalScan, watchGlobalScans } = await import("../extension/src/host/global-scan");
  vi.useFakeTimers();
  const watch = watchGlobalScans(() => root);
  try {
    writeLastScan(p, OLD);
    const startedAt = Date.now();
    rememberGlobalScan(root, startedAt, { chat: "copilot" });
    const check = announce(p, { kind: "check", title: "Scan of the System", phase: "scanning", chat: "editor" });
    vi.advanceTimersByTime(200);
    finishCheck(p, check.id);
    vi.advanceTimersByTime(200);
    expect(readLastScan(p)).toBe(new Date(startedAt).toISOString());
  } finally {
    watch.dispose();
    vi.useRealTimers();
  }
});
