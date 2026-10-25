import { describe, expect, test } from "bun:test";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { certificateErrorText } from "../extension/src/certificate-errors";
import { parseChatMessage } from "../extension/src/host/omp-chat/messages";
import { bundlePath, setSystemCertificatesSetting } from "../extension/src/host/system-certificates";
import { OmpUsage, ompUsageRunner, USAGE_MIN_INTERVAL_MS, type UsageMessage, type UsageSource } from "../extension/src/host/omp-chat/usage";
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

  posix("names a certificate error in plain words, with the saved mode, instead of the usage error, and keeps the exit code for other failures", () =>
    inTempDir(async (root) => {
      const program = fakeOmp(root, "echo 'Error: SELF_SIGNED_CERT_IN_CHAIN' >&2\nexit 1");
      try {
        setSystemCertificatesSetting(() => false);
        await expect(runnerFor(program, root)()).rejects.toThrow(certificateErrorText(false));
        setSystemCertificatesSetting(() => true);
        await expect(runnerFor(program, root)()).rejects.toThrow(certificateErrorText(true));
      } finally {
        setSystemCertificatesSetting(() => false);
      }
      await expect(runnerFor(fakeOmp(root, "echo 'disk full' >&2\nexit 1"), root)()).rejects.toThrow("omp exited with code 1");
    }),
  );

  posix("receives the bundle with the saved mode on and a bundle on disk, and nothing with the mode off", () =>
    inTempDir(async (root) => {
      const saved = { HOME: process.env["HOME"], XDG_CACHE_HOME: process.env["XDG_CACHE_HOME"] };
      process.env["HOME"] = root;
      delete process.env["XDG_CACHE_HOME"];
      try {
        const path = bundlePath();
        mkdirSync(dirname(path), { recursive: true });
        writeFileSync(path, "bundle\n");
        const program = fakeOmp(root, `printf '%s' "\${NODE_EXTRA_CA_CERTS:-none}|\${DENO_CERT:-none}" > "${join(root, "env")}"\ncat <<'EOF'\n${REPORT}\nEOF`);
        setSystemCertificatesSetting(() => true);
        await runnerFor(program, root)();
        expect(readFileSync(join(root, "env"), "utf8")).toBe(`${path}|${path}`);
        setSystemCertificatesSetting(() => false);
        await runnerFor(program, root)();
        expect(readFileSync(join(root, "env"), "utf8")).toBe(`${process.env["NODE_EXTRA_CA_CERTS"] ?? "none"}|${process.env["DENO_CERT"] ?? "none"}`);
      } finally {
        setSystemCertificatesSetting(() => false);
        for (const [name, value] of Object.entries(saved)) {
          if (value === undefined) delete process.env[name];
          else process.env[name] = value;
        }
      }
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

/** A usage source that counts what the view asks of it, by kind, and lets the test change it. */
class FakeUsage implements UsageSource {
  requests = 0;
  ensures = 0;
  turnsEnded = 0;
  current: UsageMessage = { type: "usage", fetching: false };
  private listeners: (() => void)[] = [];
  request(): void {
    this.requests++;
  }
  ensure(): void {
    this.ensures++;
  }
  turnEnded(): void {
    this.turnsEnded++;
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

function surfaceOf(posted: ToChatWebview[]): ChatSurface {
  return { post: (message) => void posted.push(message), setVisible() {}, reveal() {}, theme: () => "auto", readText: () => undefined, openLink() {} };
}

function setupView() {
  const posted: ToChatWebview[] = [];
  const usage = new FakeUsage();
  const model = new ChatViewModel(surfaceOf(posted), () => true, () => [], () => true, undefined, usage);
  return { model, usage, posted };
}

/** The view on the real usage, with the runs and the clock in the hands of the test. */
function setupRealView() {
  const { run, calls } = controlledRun();
  const clock = { now: 5_000_000 };
  const usage = new OmpUsage(run, () => clock.now);
  const model = new ChatViewModel(surfaceOf([]), () => true, () => [], () => true, undefined, usage);
  return { model, usage, calls, clock };
}

describe("when the view asks for the usage", () => {
  test("a tab that comes to the view, General or a conversation, asks to be sure the window has a report; General already there asks nothing more", () => {
    const { model, usage } = setupView();
    model.showGeneral();
    expect(usage.ensures).toBe(1);
    model.showGeneral();
    expect(usage.ensures).toBe(1);
    model.open({ id: "job", name: "T3" }, undefined, { focus: false });
    expect(usage.ensures).toBe(2);
    expect(usage.requests).toBe(0);
  });

  test("the end of the turn of any conversation tells the usage, General or a job's; its start does not", () => {
    const { model, usage } = setupView();
    model.open({ id: "job", name: "T3" }, undefined, { focus: false });
    model.setWorking("job", true);
    expect(usage.turnsEnded).toBe(0);
    model.setWorking("job", false);
    expect(usage.turnsEnded).toBe(1);
    model.showGeneral();
    model.setWorking("general", true);
    expect(usage.turnsEnded).toBe(1);
    model.setWorking("general", false);
    expect(usage.turnsEnded).toBe(2);
    model.setWorking("job", true);
    model.setWorking("job", false);
    expect(usage.turnsEnded).toBe(3);
  });

  test("refreshUsage asks whenever the window has a tab, General or not, and is ignored with none; it takes no field", () => {
    const { model, usage } = setupView();
    model.receive({ type: "refreshUsage" });
    expect(usage.requests).toBe(0);
    model.open({ id: "job", name: "T3" }, undefined, { focus: false });
    model.receive({ type: "refreshUsage" });
    expect(usage.requests).toBe(1);
    model.showGeneral();
    model.receive({ type: "refreshUsage" });
    expect(usage.requests).toBe(2);
    model.close("job");
    model.removeGeneral();
    model.receive({ type: "refreshUsage" });
    expect(usage.requests).toBe(2);
    expect(parseChatMessage({ type: "refreshUsage" })).toEqual({ type: "refreshUsage" });
    expect(parseChatMessage({ type: "refreshUsage", extra: 1 })).toBeUndefined();
  });
});

describe("when omp is asked for the usage", () => {
  test("a window with no General and one conversation of a job asks once, and a window with no conversation asks nothing", () => {
    const { model, calls } = setupRealView();
    expect(calls).toHaveLength(0);
    model.open({ id: "job", name: "T3" }, undefined, { focus: false });
    expect(calls).toHaveLength(1);
  });

  test("a conversation that opens with a report already there, or a request running, asks nothing", async () => {
    const { model, calls } = setupRealView();
    model.open({ id: "first", name: "T1" }, undefined, { focus: false });
    model.open({ id: "second", name: "T2" }, undefined, { focus: false });
    expect(calls).toHaveLength(1);
    calls[0]?.resolve(REPORT);
    await settle();
    model.open({ id: "third", name: "T3" }, undefined, { focus: false });
    model.showGeneral();
    expect(calls).toHaveLength(1);
  });

  test("a conversation that opens while the window has no successful report asks again", async () => {
    const { model, calls } = setupRealView();
    model.open({ id: "first", name: "T1" }, undefined, { focus: false });
    calls[0]?.reject("omp exited with code 3");
    await settle();
    model.open({ id: "second", name: "T2" }, undefined, { focus: false });
    expect(calls).toHaveLength(2);
  });

  test("the end of a turn asks after more than 60 seconds and not before, also after a failure, and leaves nothing waiting", async () => {
    const { model, calls, clock } = setupRealView();
    model.open({ id: "job", name: "T3" }, undefined, { focus: false });
    calls[0]?.reject("omp exited with code 3");
    await settle();
    const endTurn = () => {
      model.setWorking("job", true);
      model.setWorking("job", false);
    };
    clock.now += USAGE_MIN_INTERVAL_MS;
    endTurn();
    expect(calls).toHaveLength(1);
    clock.now += 1;
    endTurn();
    expect(calls).toHaveLength(2);
    // A turn that ends while that request runs asks nothing and does not queue one.
    endTurn();
    calls[1]?.resolve(REPORT);
    await settle();
    expect(calls).toHaveLength(2);
    clock.now += USAGE_MIN_INTERVAL_MS;
    endTurn();
    expect(calls).toHaveLength(2);
    clock.now += 1;
    endTurn();
    expect(calls).toHaveLength(3);
  });

  test("the first end of a turn asks when no request has run yet, in General too", () => {
    const { usage, calls } = setupRealView();
    usage.turnEnded();
    expect(calls).toHaveLength(1);
  });

  test("the opening of the usage dialog always asks; with a request running it waits for one more, whatever the clock", async () => {
    const { model, calls } = setupRealView();
    model.showGeneral();
    calls[0]?.resolve(REPORT);
    await settle();
    model.receive({ type: "refreshUsage" });
    expect(calls).toHaveLength(2);
    model.receive({ type: "refreshUsage" });
    model.receive({ type: "refreshUsage" });
    expect(calls).toHaveLength(2);
    calls[1]?.resolve(REPORT);
    await settle();
    expect(calls).toHaveLength(3);
    calls[2]?.resolve(REPORT);
    await settle();
    expect(calls).toHaveLength(3);
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
