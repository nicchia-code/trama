import { describe, expect, test } from "bun:test";
import { chmodSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseChatMessage } from "../extension/src/host/omp-chat/messages";
import { OmpUsage, ompUsageRunner, type UsageMessage, type UsageSource } from "../extension/src/host/omp-chat/usage";
import { type ChatSurface, ChatViewModel } from "../extension/src/host/omp-chat/view-model";
import type { ToChatWebview } from "../extension/src/omp-chat-protocol";

const REPORT = JSON.stringify({
  generatedAt: 1000,
  reports: [{ provider: "anthropic", limits: [{ label: "Claude 5 Hour", scope: { windowId: "5h" }, window: { durationMs: 18_000_000, resetsAt: 5000 }, amount: { usedFraction: 0.11 } }] }],
});
const WINDOW = { short: "5h", label: "Claude 5 Hour", usedFraction: 0.11, resetsAt: 5000 };

/** A run of `omp usage` that finishes when the test says so. */
function controlledRun() {
  const calls: { resolve(output: string): void; reject(reason: string): void }[] = [];
  const run = () => {
    const { promise, resolve, reject } = Promise.withResolvers<string>();
    calls.push({ resolve, reject: (reason) => reject(new Error(reason)) });
    return promise;
  };
  return { run, calls };
}

/** The fakes settle at once, so draining the microtask queue is enough: no timer is needed. */
async function settle(): Promise<void> {
  for (let turn = 0; turn < 20; turn++) await Promise.resolve();
}

describe("the usage held by the host", () => {
  test("nothing is known before the first report: no report, no request, nothing fetching", () => {
    const usage = new OmpUsage(controlledRun().run);
    expect(usage.message()).toEqual({ type: "usage", fetching: false });
  });

  test("a request runs omp; the report replaces the last and carries the instant omp made it", async () => {
    const { run, calls } = controlledRun();
    const usage = new OmpUsage(run);
    const changes: UsageMessage[] = [];
    usage.onChange(() => changes.push(usage.message()));
    usage.request();
    expect(calls).toHaveLength(1);
    expect(usage.message()).toEqual({ type: "usage", fetching: true });
    calls[0]?.resolve(REPORT);
    await settle();
    expect(usage.message()).toEqual({ type: "usage", fetching: false, report: { generatedAt: 1000, providers: [{ id: "anthropic", name: "anthropic", windows: [WINDOW] }] } });
    expect(changes.map((change) => change.fetching)).toEqual([true, false]);
  });

  test("requests that arrive while one runs become one, which starts when it ends", async () => {
    const { run, calls } = controlledRun();
    const usage = new OmpUsage(run);
    usage.request();
    usage.request();
    usage.request();
    usage.request();
    expect(calls).toHaveLength(1);
    calls[0]?.resolve(REPORT);
    await settle();
    expect(calls).toHaveLength(2);
    expect(usage.message().fetching).toBe(true);
    usage.request();
    calls[1]?.resolve(REPORT);
    await settle();
    expect(calls).toHaveLength(3);
    calls[2]?.resolve(REPORT);
    await settle();
    expect(calls).toHaveLength(3);
    expect(usage.message().fetching).toBe(false);
  });

  test("a failed request keeps the last report and the reason; the next success clears the reason", async () => {
    const { run, calls } = controlledRun();
    const usage = new OmpUsage(run);
    usage.request();
    calls[0]?.resolve(REPORT);
    await settle();
    usage.request();
    calls[1]?.reject("omp exited with code 3");
    await settle();
    expect(usage.message()).toEqual({ type: "usage", fetching: false, error: "omp exited with code 3", report: { generatedAt: 1000, providers: [{ id: "anthropic", name: "anthropic", windows: [WINDOW] }] } });
    usage.request();
    calls[2]?.resolve(REPORT);
    await settle();
    expect(usage.message().error).toBeUndefined();
    expect(usage.message().report?.providers).toHaveLength(1);
  });

  test("a failure with no report before it leaves no report; an unreadable output is a failure too", async () => {
    const { run, calls } = controlledRun();
    const usage = new OmpUsage(run);
    usage.request();
    calls[0]?.reject("omp did not answer within 30 s");
    await settle();
    expect(usage.message()).toEqual({ type: "usage", fetching: false, error: "omp did not answer within 30 s" });
    usage.request();
    calls[1]?.resolve("not json");
    await settle();
    expect(usage.message()).toEqual({ type: "usage", fetching: false, error: "omp usage did not return a valid report" });
  });

  test("a successful report with no provider replaces the last one", async () => {
    const { run, calls } = controlledRun();
    const usage = new OmpUsage(run, () => 77);
    usage.request();
    calls[0]?.resolve(REPORT);
    await settle();
    usage.request();
    calls[1]?.resolve(JSON.stringify({ reports: [] }));
    await settle();
    expect(usage.message()).toEqual({ type: "usage", fetching: false, report: { generatedAt: 77, providers: [] } });
  });
});

// Windows has no `#!/bin/sh` programs, so the tests that run a fake omp are skipped there.
const posix = process.platform === "win32" ? test.skip : test;

function fakeOmp(root: string, script: string): string {
  const program = join(root, "omp");
  writeFileSync(program, `#!/bin/sh\n${script}\n`);
  chmodSync(program, 0o755);
  return program;
}

async function inTempDir<T>(body: (root: string) => Promise<T>): Promise<T> {
  const root = mkdtempSync(join(tmpdir(), "trama-usage-"));
  try {
    return await body(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const runnerFor = (program: string | undefined, folder?: string, timeoutMs?: number) =>
  ompUsageRunner({ ompPath: () => program ?? "", findOmp: async () => program, folder: () => folder }, timeoutMs);

describe("omp usage --json", () => {
  posix("runs the program with the fixed arguments, in General's folder, and gives its output", () =>
    inTempDir(async (root) => {
      const program = fakeOmp(root, `printf '%s|%s|%s' "$1" "$2" "$#" > "${join(root, "args")}"\npwd -P > "${join(root, "cwd")}"\ncat <<'EOF'\n${REPORT}\nEOF`);
      const output = await runnerFor(program, root)();
      expect(JSON.parse(output)).toEqual(JSON.parse(REPORT));
      expect(readFileSync(join(root, "args"), "utf8")).toBe("usage|--json|2");
      expect(readFileSync(join(root, "cwd"), "utf8").trim()).toBe(realpathSync(root));
    }),
  );

  posix("names the exit code when omp fails", () =>
    inTempDir(async (root) => {
      const program = fakeOmp(root, "echo failure >&2\nexit 3");
      await expect(runnerFor(program, root)()).rejects.toThrow("omp exited with code 3");
    }),
  );

  posix("names a program that does not answer in time", () =>
    inTempDir(async (root) => {
      const program = fakeOmp(root, "exec sleep 5");
      await expect(runnerFor(program, root, 200)()).rejects.toThrow("omp did not answer within 0.2 s");
    }),
  );

  test("names a program that is not there, with its path, and one that is not installed, with the editor PATH", async () => {
    const missing = join(tmpdir(), "trama-usage-no-such-omp");
    await expect(runnerFor(missing)()).rejects.toThrow(`omp not found at ${missing}`);
    await expect(ompUsageRunner({ ompPath: () => "", findOmp: async () => undefined, folder: () => undefined })()).rejects.toThrow("omp not found at the editor PATH");
    await expect(ompUsageRunner({ ompPath: () => "/opt/omp", findOmp: async () => undefined, folder: () => undefined })()).rejects.toThrow("omp not found at /opt/omp");
  });

  posix("an OmpUsage on the runner keeps the reason of a failed run", () =>
    inTempDir(async (root) => {
      const usage = new OmpUsage(runnerFor(fakeOmp(root, "exit 2"), root));
      const ended = Promise.withResolvers<void>();
      usage.onChange(() => usage.message().fetching || ended.resolve());
      usage.request();
      await ended.promise;
      expect(usage.message()).toEqual({ type: "usage", fetching: false, error: "omp exited with code 2" });
    }),
  );
});

/** A usage source that counts the requests and lets the test change it. */
class FakeUsage implements UsageSource {
  requests = 0;
  current: UsageMessage = { type: "usage", fetching: false };
  private listeners: (() => void)[] = [];
  request(): void {
    this.requests++;
  }
  message(): UsageMessage {
    return this.current;
  }
  onChange(listener: () => void) {
    this.listeners.push(listener);
    return { dispose() {} };
  }
  change(next: UsageMessage): void {
    this.current = next;
    for (const listener of this.listeners) listener();
  }
}

function setupView() {
  const posted: ToChatWebview[] = [];
  const surface: ChatSurface = { post: (message) => void posted.push(message), setVisible() {}, reveal() {}, theme: () => "auto", readText: () => undefined, openLink() {} };
  const usage = new FakeUsage();
  const model = new ChatViewModel(surface, () => true, () => [], () => true, undefined, usage);
  return { model, usage, posted };
}

describe("when the view asks for the usage", () => {
  test("General coming to the view asks once; General already there asks nothing", () => {
    const { model, usage } = setupView();
    model.showGeneral();
    expect(usage.requests).toBe(1);
    model.showGeneral();
    expect(usage.requests).toBe(1);
  });

  test("the end of the turn of any conversation asks, General or a job's; its start and a window with no General do not", () => {
    const { model, usage } = setupView();
    model.open({ id: "job", name: "T3" }, undefined, { focus: false });
    model.setWorking("job", true);
    model.setWorking("job", false);
    expect(usage.requests).toBe(0);
    model.showGeneral();
    expect(usage.requests).toBe(1);
    model.setWorking("job", true);
    expect(usage.requests).toBe(1);
    model.setWorking("job", false);
    expect(usage.requests).toBe(2);
    model.setWorking("general", true);
    model.setWorking("general", false);
    expect(usage.requests).toBe(3);
  });

  test("refreshUsage asks while General is there and is ignored without it; it takes no field", () => {
    const { model, usage } = setupView();
    model.receive({ type: "refreshUsage" });
    expect(usage.requests).toBe(0);
    model.showGeneral();
    model.receive({ type: "refreshUsage" });
    expect(usage.requests).toBe(2);
    expect(parseChatMessage({ type: "refreshUsage" })).toEqual({ type: "refreshUsage" });
    expect(parseChatMessage({ type: "refreshUsage", extra: 1 })).toBeUndefined();
  });

  test("the webview gets the usage when it starts and at each change, and none while it is not there", () => {
    const { model, usage, posted } = setupView();
    usage.change({ type: "usage", fetching: true });
    expect(posted).toEqual([]);
    model.webviewReady();
    const types = posted.map((message) => message.type);
    expect(types.indexOf("usage")).toBeGreaterThan(types.indexOf("reset"));
    const report = { generatedAt: 1, providers: [{ id: "anthropic", name: "anthropic", windows: [WINDOW] }] };
    usage.change({ type: "usage", fetching: false, report });
    expect(posted.at(-1)).toEqual({ type: "usage", fetching: false, report });
  });
});
