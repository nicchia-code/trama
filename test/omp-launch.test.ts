import { afterEach, beforeEach, expect, mock, test } from "bun:test";
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
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

/** A fake omp whose `--version` prints `version`, whose `update --check` prints `check` and exits with `checkCode`, and whose `update` takes a moment and exits with `updateCode`. */
function fakeOmp(check: string, checkCode = 0, version = "18.12.6", updateCode = 0): string {
  const program = join(dir, "omp");
  writeFileSync(program, `#!/bin/sh\nif [ "$1" = "--version" ]; then printf '%s' '${version}'; exit 0; fi\nif [ "$1 $2" = "update --check" ]; then printf '%s\\n' '${check}'; exit ${checkCode}; fi\nsleep 0.2\nexit ${updateCode}\n`);
  chmodSync(program, 0o755);
  return program;
}

beforeEach(async () => {
  dir = mkdtempSync(join(tmpdir(), "omp-launch-"));
  warnings.length = 0;
  infos.length = 0;
  progress.length = 0;
  commands.length = 0;
  choose = undefined;
  const { forgetUpdateCheck, setUpdateStore } = await import("../extension/src/host/omp-update");
  setUpdateStore(undefined);
  forgetUpdateCheck();
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

test("an up to date omp launches with its program and no notice", async () => {
  if (!posix) return;
  const { ompBeforeLaunch } = await import("../extension/src/host/omp-launch");
  const program = fakeOmp("Current version: 18.12.6\nAlready up to date");
  expect(await ompBeforeLaunch(program)).toBe(program);
  expect(warnings).toEqual([]);
  expect(infos).toEqual([]);
  expect(progress).toEqual([]);
});

test("a newer version is installed behind a progress notification, and the launch goes on after it", async () => {
  if (!posix) return;
  const { ompBeforeLaunch } = await import("../extension/src/host/omp-launch");
  const program = fakeOmp("Current version: 18.12.6\nNew version available: 18.13.0");
  const [a, b] = await Promise.all([ompBeforeLaunch(program), ompBeforeLaunch(program)]);
  expect([a, b]).toEqual([program, program]);
  expect(progress).toEqual(["Updating omp to 18.13.0…"]);
  expect(infos).toEqual([]);
});

test("a failed check launches with the omp of before and tells why once for the check, however many launches joined it", async () => {
  if (!posix) return;
  const { ompBeforeLaunch } = await import("../extension/src/host/omp-launch");
  const program = fakeOmp("x", 4);
  const [a, b] = await Promise.all([ompBeforeLaunch(program), ompBeforeLaunch(program)]);
  expect([a, b]).toEqual([program, program]);
  expect(infos).toEqual(["Trama: could not update omp (omp update --check exited with code 4). The agent runs with omp 18.12.6."]);
  // The outcome holds for an hour: the next launch neither checks nor tells again.
  expect(await ompBeforeLaunch(program)).toBe(program);
  expect(infos).toHaveLength(1);
});

const TOO_OLD = "Trama needs omp 18.12.6 or later; the installed omp is 18.12.5.";

test("an omp older than the minimum that the update does not fix stops the launch with its own notice and the two buttons of the missing omp", async () => {
  if (!posix) return;
  const { ompBeforeLaunch } = await import("../extension/src/host/omp-launch");
  const program = fakeOmp("Current version: 18.12.5\nAlready up to date", 0, "18.12.5");
  expect(await ompBeforeLaunch(program)).toBeUndefined();
  expect(warnings).toEqual([{ message: TOO_OLD, buttons: ["Install omp", "Open Settings"] }]);
  expect(infos).toEqual([]);
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
  expect(progress).toEqual(["Updating omp to 18.13.0…"]);
  const { forgetUpdateCheck } = await import("../extension/src/host/omp-update");
  forgetUpdateCheck();
  warnings.length = 0;
  progress.length = 0;
  const updated = fakeOmp("Current version: 18.12.5\nNew version available: 18.13.0", 0, "18.12.5");
  expect(await ompBeforeLaunch(updated)).toBe(updated);
  expect(progress).toEqual(["Updating omp to 18.13.0…"]);
  expect(warnings).toEqual([]);
});

test("an omp whose version cannot be read stops the launch, saying the installed omp is unknown; a failed check of a recent omp does not", async () => {
  if (!posix) return;
  const { ompBeforeLaunch } = await import("../extension/src/host/omp-launch");
  expect(await ompBeforeLaunch(fakeOmp("Current version: 18.12.6\nAlready up to date", 0, ""))).toBeUndefined();
  expect(warnings.map((warning) => warning.message)).toEqual(["Trama needs omp 18.12.6 or later; the installed omp is unknown."]);
  const { forgetUpdateCheck } = await import("../extension/src/host/omp-update");
  forgetUpdateCheck();
  warnings.length = 0;
  const recent = fakeOmp("x", 4);
  expect(await ompBeforeLaunch(recent)).toBe(recent);
  expect(warnings).toEqual([]);
});

test("checkedOmp is the check General uses: it shows no notice of its own for a missing or too old omp", async () => {
  if (!posix) return;
  const { checkedOmp } = await import("../extension/src/host/omp-launch");
  expect(await checkedOmp(fakeOmp("Current version: 18.12.5\nAlready up to date", 0, "18.12.5"))).toEqual({ version: "18.12.5", tooOld: true });
  expect(await checkedOmp(join(dir, "no-such-omp"))).toEqual({ missing: true });
  expect(warnings).toEqual([]);
  expect(infos).toEqual([]);
});
