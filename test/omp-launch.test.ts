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

/** A fake omp whose `update --check` prints `check` and exits with `checkCode`, and whose `update` takes a moment. */
function fakeOmp(check: string, checkCode = 0): string {
  const program = join(dir, "omp");
  writeFileSync(program, `#!/bin/sh\nif [ "$1 $2" = "update --check" ]; then printf '%s\\n' '${check}'; exit ${checkCode}; fi\nsleep 0.2\nexit 0\n`);
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
  expect(infos).toEqual(["Trama: could not update omp (omp update --check exited with code 4). The agent runs with omp the installed version."]);
  // The outcome holds for an hour: the next launch neither checks nor tells again.
  expect(await ompBeforeLaunch(program)).toBe(program);
  expect(infos).toHaveLength(1);
});
