import { afterEach, beforeEach, expect, mock, test } from "bun:test";
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const warnings: { message: string; buttons: string[] }[] = [];
const infos: string[] = [];
const progress: string[] = [];
const commands: string[] = [];
let choose: string | undefined;

mock.module("vscode", () => ({
  window: {
    showWarningMessage: async (message: string, ...buttons: string[]) => (warnings.push({ message, buttons }), choose),
    showInformationMessage: async (message: string) => void infos.push(message),
    withProgress: async (options: { title: string }, task: () => Promise<unknown>) => (progress.push(options.title), task()),
  },
  commands: { executeCommand: async (id: string) => void commands.push(id) },
  ProgressLocation: { Notification: 15 },
}));

const posix = process.platform !== "win32";
let dir = "";

/**
 * A fake omp whose `--version` prints `version` (`afterUpdate` once a successful `update` ran), whose `update --check` prints `check` and exits with `checkCode`, and whose
 * `update` takes a moment and exits with `updateCode`. Every call is appended to the `calls` file.
 */
function fakeOmp(check: string, checkCode = 0, version = "18.12.6", updateCode = 0, afterUpdate = version): string {
  const program = join(dir, "omp");
  const script = [
    "#!/bin/sh",
    `echo "$@" >> "${join(dir, "calls")}"`,
    `if [ "$1" = "--version" ]; then if [ -f "${join(dir, "updated")}" ]; then printf '%s' '${afterUpdate}'; else printf '%s' '${version}'; fi; exit 0; fi`,
    `if [ "$1 $2" = "update --check" ]; then printf '%s\\n' '${check}'; exit ${checkCode}; fi`,
    "sleep 0.2",
    `if [ ${updateCode} -eq 0 ]; then touch "${join(dir, "updated")}"; fi`,
    `exit ${updateCode}`,
    "",
  ].join("\n");
  writeFileSync(program, script);
  chmodSync(program, 0o755);
  return program;
}

/** The calls of the fake omp, `--version` left out. */
const called = (): string[] => (existsSync(join(dir, "calls")) ? readFileSync(join(dir, "calls"), "utf8").split("\n").filter((line) => line !== "" && line !== "--version") : []);

/** Waits, in real time, until `condition` holds: the background check of a launch ends on its own. */
async function until(condition: () => boolean, ms = 5000): Promise<void> {
  for (let waited = 0; waited < ms && !condition(); waited += 10) await Bun.sleep(10);
}

beforeEach(async () => {
  dir = mkdtempSync(join(tmpdir(), "omp-launch-"));
  warnings.length = 0;
  infos.length = 0;
  progress.length = 0;
  commands.length = 0;
  choose = undefined;
  const { forgetOmp, setUpdateStore } = await import("../extension/src/host/omp-update");
  setUpdateStore(undefined);
  forgetOmp();
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

test("a missing omp stops the launch with the notice and its two buttons; Install omp opens the installer's terminal, Open Settings the Settings tab", async () => {
  const { ompBeforeLaunch, OMP_MISSING_NOTICE } = await import("../extension/src/host/omp-launch");
  expect(await ompBeforeLaunch(join(dir, "no-such-omp"))).toBeUndefined();
  expect(warnings).toEqual([{ message: "Trama: omp is not installed. Trama runs every agent with omp.", buttons: ["Install omp", "Open Settings"] }]);
  expect(OMP_MISSING_NOTICE).toBe(warnings[0]?.message as string);
  choose = "Install omp";
  await ompBeforeLaunch(join(dir, "no-such-omp"));
  choose = "Open Settings";
  await ompBeforeLaunch(join(dir, "no-such-omp"));
  await Bun.sleep(5);
  expect(commands).toEqual(["trama.installOmp", "trama.openSettings"]);
  expect(infos).toEqual([]);
});

/** The window's global state, in memory; the test reads the outcome of the check from it. */
async function keptState(): Promise<Map<string, unknown>> {
  const { setUpdateStore } = await import("../extension/src/host/omp-update");
  const kept = new Map<string, unknown>();
  setUpdateStore({ get: <T,>(key: string) => kept.get(key) as T | undefined, update: async (key, value) => void kept.set(key, value) });
  return kept;
}
const KEY = "trama.ompUpdateCheck";
const hasNewer = (kept: Map<string, unknown>): boolean => (kept.get(KEY) as { newer?: string } | undefined)?.newer !== undefined;

test("an up to date omp launches at once with its program and no notice; the check the launch starts runs in the background and tells nothing", async () => {
  if (!posix) return;
  const { ompBeforeLaunch } = await import("../extension/src/host/omp-launch");
  const kept = await keptState();
  const program = fakeOmp("Current version: 18.12.6\nAlready up to date");
  expect(await ompBeforeLaunch(program)).toBe(program);
  expect(warnings).toEqual([]);
  expect(infos).toEqual([]);
  expect(progress).toEqual([]);
  await until(() => kept.get(KEY) !== undefined);
  expect(called()).toEqual(["update --check"]);
  expect(kept.get(KEY)).toMatchObject({ omp: program, version: "18.12.6" });
  // The outcome holds: the next launches neither check nor ask for the version again.
  expect(await ompBeforeLaunch(program)).toBe(program);
  expect(await ompBeforeLaunch(program)).toBe(program);
  expect(called()).toEqual(["update --check"]);
  expect(infos).toEqual([]);
});

test("a launch never waits for the check: an omp whose check takes long still launches at once", async () => {
  if (!posix) return;
  const { ompBeforeLaunch } = await import("../extension/src/host/omp-launch");
  const kept = await keptState();
  const program = fakeOmp("Current version: 18.12.6\nAlready up to date");
  writeFileSync(program, readFileSync(program, "utf8").replace('if [ "$1 $2" = "update --check" ]; then', 'if [ "$1 $2" = "update --check" ]; then sleep 0.6;'));
  const started = Date.now();
  expect(await ompBeforeLaunch(program)).toBe(program);
  expect(Date.now() - started).toBeLessThan(450);
  expect(kept.get(KEY)).toBeUndefined();
  await until(() => kept.get(KEY) !== undefined);
});

test("a newer version a check found is installed before the next launch, behind a progress notification, and both launches that find it wait for the one update", async () => {
  if (!posix) return;
  const { ompBeforeLaunch } = await import("../extension/src/host/omp-launch");
  const kept = await keptState();
  const program = fakeOmp("Current version: 18.12.6\nNew version available: 18.13.0", 0, "18.12.6", 0, "18.13.0");
  // The first launch finds nothing to wait for: the check runs behind it.
  expect(await ompBeforeLaunch(program)).toBe(program);
  expect(progress).toEqual([]);
  await until(() => hasNewer(kept));
  expect(called()).toEqual(["update --check"]);
  const [a, b] = await Promise.all([ompBeforeLaunch(program), ompBeforeLaunch(program)]);
  expect([a, b]).toEqual([program, program]);
  expect(progress).toEqual(["Updating omp to 18.13.0…"]);
  expect(called()).toEqual(["update --check", "update"]);
  expect(infos).toEqual([]);
  expect(kept.get(KEY)).toMatchObject({ omp: program, version: "18.13.0" });
  expect(hasNewer(kept)).toBe(false);
});

test("a failed check launches with the omp of before and tells why once for the check, however many launches started under it", async () => {
  if (!posix) return;
  const { ompBeforeLaunch } = await import("../extension/src/host/omp-launch");
  const program = fakeOmp("x", 4);
  const [a, b] = await Promise.all([ompBeforeLaunch(program), ompBeforeLaunch(program)]);
  expect([a, b]).toEqual([program, program]);
  await until(() => infos.length > 0);
  expect(infos).toEqual(["Trama: could not update omp (omp update --check exited with code 4). The agent runs with omp 18.12.6."]);
  // The outcome holds for an hour: the next launch neither checks nor tells again.
  expect(await ompBeforeLaunch(program)).toBe(program);
  expect(infos).toHaveLength(1);
  expect(called()).toEqual(["update --check"]);
  expect(warnings).toEqual([]);
});

test("a failed update launches with the omp of before and tells why once for the update, however many launches waited for it", async () => {
  if (!posix) return;
  const { ompBeforeLaunch } = await import("../extension/src/host/omp-launch");
  const kept = await keptState();
  const program = fakeOmp("Current version: 18.12.6\nNew version available: 18.13.0", 0, "18.12.6", 3);
  await ompBeforeLaunch(program);
  await until(() => hasNewer(kept));
  const [a, b] = await Promise.all([ompBeforeLaunch(program), ompBeforeLaunch(program)]);
  expect([a, b]).toEqual([program, program]);
  expect(infos).toEqual(["Trama: could not update omp (omp update exited with code 3). The agent runs with omp 18.12.6."]);
  expect(progress).toEqual(["Updating omp to 18.13.0…"]);
  // The failed update is not tried again at the next launch.
  expect(await ompBeforeLaunch(program)).toBe(program);
  expect(called()).toEqual(["update --check", "update"]);
  expect(infos).toHaveLength(1);
  expect(warnings).toEqual([]);
});

const TOO_OLD = "Trama needs omp 18.12.6 or later; the installed omp is 18.12.5.";

test("an omp older than the minimum that the update does not fix stops the launch with its own notice and the two buttons of the missing omp", async () => {
  if (!posix) return;
  const { ompBeforeLaunch } = await import("../extension/src/host/omp-launch");
  const program = fakeOmp("Current version: 18.12.5\nAlready up to date", 0, "18.12.5");
  expect(await ompBeforeLaunch(program)).toBeUndefined();
  expect(warnings).toEqual([{ message: TOO_OLD, buttons: ["Install omp", "Open Settings"] }]);
  expect(infos).toEqual([]);
  // The update ran first, with no version to name.
  expect(progress).toEqual(["Updating omp…"]);
  expect(called()).toEqual(["update"]);
  choose = "Install omp";
  expect(await ompBeforeLaunch(program)).toBeUndefined();
  choose = "Open Settings";
  expect(await ompBeforeLaunch(program)).toBeUndefined();
  await Bun.sleep(5);
  expect(commands).toEqual(["trama.installOmp", "trama.openSettings"]);
});

test("a failed update of an omp that is too old stops the launch with the same notice; the update that reaches the minimum lets it go on after the progress notification", async () => {
  if (!posix) return;
  const { ompBeforeLaunch } = await import("../extension/src/host/omp-launch");
  const failing = fakeOmp("Current version: 18.12.5\nNew version available: 18.13.0", 0, "18.12.5", 3);
  expect(await ompBeforeLaunch(failing)).toBeUndefined();
  expect(warnings.map((warning) => warning.message)).toEqual([TOO_OLD]);
  expect(infos).toEqual([]);
  expect(progress).toEqual(["Updating omp…"]);
  const { forgetOmp } = await import("../extension/src/host/omp-update");
  forgetOmp();
  warnings.length = 0;
  progress.length = 0;
  const updated = fakeOmp("Current version: 18.12.5\nNew version available: 18.13.0", 0, "18.12.5", 0, "18.13.0");
  expect(await ompBeforeLaunch(updated)).toBe(updated);
  expect(progress).toEqual(["Updating omp…"]);
  expect(warnings).toEqual([]);
});

test("an omp whose version cannot be read stops the launch, saying the installed omp is unknown; a failed check of a recent omp does not", async () => {
  if (!posix) return;
  const { ompBeforeLaunch } = await import("../extension/src/host/omp-launch");
  expect(await ompBeforeLaunch(fakeOmp("Current version: 18.12.6\nAlready up to date", 0, ""))).toBeUndefined();
  expect(warnings.map((warning) => warning.message)).toEqual(["Trama needs omp 18.12.6 or later; the installed omp is unknown."]);
  const { forgetOmp } = await import("../extension/src/host/omp-update");
  forgetOmp();
  warnings.length = 0;
  const kept = await keptState();
  const recent = fakeOmp("x", 4);
  expect(await ompBeforeLaunch(recent)).toBe(recent);
  expect(warnings).toEqual([]);
  // The failed check of the background tells its own notice, which this test does not look at.
  await until(() => infos.length > 0 && kept.get(KEY) !== undefined);
});

test("the omp is searched once per window: a launch with the same path takes the program the module keeps", async () => {
  if (!posix) return;
  const { ompBeforeLaunch } = await import("../extension/src/host/omp-launch");
  const kept = await keptState();
  const program = fakeOmp("Current version: 18.12.6\nAlready up to date");
  expect(await ompBeforeLaunch(program)).toBe(program);
  await until(() => kept.get(KEY) !== undefined);
  // The module has the program and its version: a program that stops answering changes nothing for the next launches.
  writeFileSync(program, "#!/bin/sh\nexit 1\n");
  expect(await ompBeforeLaunch(program)).toBe(program);
  expect(warnings).toEqual([]);
});

test("General's version is the module's: it reads the version only, with no update check, no update and no notice, and asks it once", async () => {
  if (!posix) return;
  const { ompVersionOutcome } = await import("../extension/src/host/omp-update");
  const marker = join(dir, "touched");
  const program = join(dir, "omp");
  writeFileSync(program, `#!/bin/sh\necho "$@" >> '${join(dir, "calls")}'\nif [ "$1" = "--version" ]; then printf '%s' '18.12.5'; exit 0; fi\ntouch '${marker}'\nexit 1\n`);
  chmodSync(program, 0o755);
  expect(await ompVersionOutcome(program)).toEqual({ version: "18.12.5", tooOld: true });
  expect(await ompVersionOutcome(program)).toEqual({ version: "18.12.5", tooOld: true });
  expect(existsSync(marker)).toBe(false);
  expect(readFileSync(join(dir, "calls"), "utf8").trim().split("\n")).toEqual(["--version"]);
  expect(await ompVersionOutcome(join(dir, "no-such-omp"))).toEqual({ missing: true });
  expect(warnings).toEqual([]);
  expect(infos).toEqual([]);
  expect(progress).toEqual([]);
});

test("General takes the version the launch's reading left in the module", async () => {
  if (!posix) return;
  const { ompBeforeLaunch } = await import("../extension/src/host/omp-launch");
  const { ompVersionOutcome } = await import("../extension/src/host/omp-update");
  const kept = await keptState();
  const program = fakeOmp("Current version: 18.12.6\nAlready up to date");
  expect(await ompBeforeLaunch(program)).toBe(program);
  await until(() => kept.get(KEY) !== undefined);
  // The program now answers a version the module did not see: the kept version is the one used.
  writeFileSync(program, "#!/bin/sh\nexit 1\n");
  expect(await ompVersionOutcome(program)).toEqual({ version: "18.12.6" });
});
