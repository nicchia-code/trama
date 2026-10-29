import { afterEach, beforeEach, expect, test } from "bun:test";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { checkHolds, newerToInstall, OMP_UPDATE_TTL_MS, ompSearchFolders, readUpdateCheck } from "../src/core/omp-update";
import { certificateErrorText } from "../extension/src/certificate-errors";
import {
  configuredOmpProgram,
  ensureOmpUpdated,
  findConfiguredOmp,
  findOmp,
  forgetOmp,
  forgetUpdateCheck,
  OMP_UPDATE_KEY,
  ompProgram,
  ompStatus,
  ompVersion,
  ompVersionOutcome,
  prepareOmpLaunch,
  setUpdateStore,
} from "../extension/src/host/omp-update";
import { bundlePath } from "../extension/src/host/system-certificates";

const posix = process.platform !== "win32";
let dir = "";
let calls = "";

/**
 * A fake omp whose `update --check` prints `check`, whose `update` exits with `updateCode` (a successful one makes `--version` print `afterUpdate` from then on) and whose
 * `--version` prints `version` (nothing for an empty one); every call is appended to the `calls` file.
 */
function fakeOmp(check: string, updateCode = 0, checkCode = 0, version = "18.12.6", afterUpdate = version): string {
  const program = join(dir, "omp");
  const script = [
    "#!/bin/sh",
    `echo "$@" >> "${calls}"`,
    `if [ "$1" = "--version" ]; then if [ -f "${dir}/updated" ]; then printf '%s' '${afterUpdate}'; else printf '%s' '${version}'; fi; exit 0; fi`,
    `if [ "$1 $2" = "update --check" ]; then printf '%s\\n' '${check}'; exit ${checkCode}; fi`,
    `if [ "$1" = "update" ]; then if [ ${updateCode} -eq 0 ]; then touch "${dir}/updated"; fi; exit ${updateCode}; fi`,
    "exit 0",
    "",
  ].join("\n");
  writeFileSync(program, script);
  chmodSync(program, 0o755);
  return program;
}

/** The calls of the fake omp, in the order they were made; `--version` is left out unless asked for. */
const called = (withVersion = false): string[] => {
  try {
    return readFileSync(calls, "utf8").trim().split("\n").filter((line) => line !== "" && (withVersion || line !== "--version"));
  } catch {
    return [];
  }
};

/** Waits, in real time, until `condition` holds: the background check of a launch ends on its own. */
async function until(condition: () => boolean, ms = 5000): Promise<void> {
  for (let waited = 0; waited < ms && !condition(); waited += 10) await Bun.sleep(10);
}

/** The window's global state, in memory. */
function keptState(): Map<string, unknown> {
  const kept = new Map<string, unknown>();
  setUpdateStore({ get: <T,>(key: string) => kept.get(key) as T | undefined, update: async (key, value) => void kept.set(key, value) });
  return kept;
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "omp-update-"));
  calls = join(dir, "calls");
  setUpdateStore(undefined);
  forgetOmp();
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

test("the answer of `omp update --check` is read without colour codes", () => {
  expect(readUpdateCheck("\u001b[1mCurrent version: 18.12.6\u001b[0m\nAlready up to date")).toEqual({ kind: "latest", version: "18.12.6" });
  expect(readUpdateCheck("Current version: 18.12.6\nNew version available: 18.13.0")).toEqual({ kind: "newer", version: "18.13.0", current: "18.12.6" });
  expect(readUpdateCheck("omp is managed by brew")).toEqual({ kind: "latest" });
  expect(readUpdateCheck("hello")).toEqual({ kind: "unexpected" });
});

test("omp is found in the PATH, then in the bun and local folders of the home; a set path is the only one", async () => {
  if (!posix) return;
  const home = join(dir, "home");
  mkdirSync(join(home, ".local", "bin"), { recursive: true });
  expect(await findOmp("", { PATH: join(dir, "none") }, home, false)).toBeUndefined();
  writeFileSync(join(home, ".local", "bin", "omp"), "#!/bin/sh\n", { mode: 0o755 });
  expect(await findOmp("", { PATH: join(dir, "none") }, home, false)).toBe(join(home, ".local", "bin", "omp"));
  mkdirSync(join(home, ".bun", "bin"), { recursive: true });
  writeFileSync(join(home, ".bun", "bin", "omp"), "#!/bin/sh\n", { mode: 0o755 });
  expect(await findOmp("", { PATH: join(dir, "none") }, home, false)).toBe(join(home, ".bun", "bin", "omp"));
  expect(await findOmp("/x/omp", { PATH: "" }, home, false)).toBe("/x/omp");
});

test("General's set trama.ompPath resolves to the path as-is only when it runs: a file, or a bare name on the PATH; otherwise missing", async () => {
  if (!posix) return;
  const home = join(dir, "home");
  expect(await findConfiguredOmp("", { PATH: join(dir, "none") }, home, false)).toBeUndefined();
  writeFileSync(join(dir, "omp-bin"), "#!/bin/sh\n", { mode: 0o755 });
  expect(await findConfiguredOmp(join(dir, "omp-bin"), { PATH: "" }, home, false)).toBe(join(dir, "omp-bin"));
  expect(await findConfiguredOmp(join(dir, "omp-missing"), { PATH: "" }, home, false)).toBeUndefined();
  expect(await findConfiguredOmp("omp-bin", { PATH: dir }, home, false)).toBe("omp-bin");
  expect(await findConfiguredOmp("omp-missing", { PATH: dir }, home, false)).toBeUndefined();
});

test("the program is searched once per window and kept; a program that is not found is searched again, and forgetOmp makes the module search again", async () => {
  if (!posix) return;
  const saved = { HOME: process.env["HOME"], PATH: process.env["PATH"] };
  const bin = join(dir, "bin");
  mkdirSync(bin);
  process.env["HOME"] = join(dir, "home");
  process.env["PATH"] = bin;
  try {
    expect(await ompProgram("")).toBeUndefined();
    writeFileSync(join(bin, "omp"), "#!/bin/sh\n", { mode: 0o755 });
    expect(await ompProgram("")).toBe(join(bin, "omp"));
    // Found: kept, so the file going away is not noticed until the module is told.
    rmSync(join(bin, "omp"));
    expect(await ompProgram("")).toBe(join(bin, "omp"));
    expect(await configuredOmpProgram("")).toBe(join(bin, "omp"));
    forgetOmp();
    expect(await ompProgram("")).toBeUndefined();
    // A set path is the program as-is; General's reading of it also asks that it runs.
    expect(await ompProgram(join(dir, "set-omp"))).toBe(join(dir, "set-omp"));
    expect(await configuredOmpProgram(join(dir, "set-omp"))).toBeUndefined();
    writeFileSync(join(dir, "set-omp"), "#!/bin/sh\n", { mode: 0o755 });
    expect(await configuredOmpProgram(join(dir, "set-omp"))).toBe(join(dir, "set-omp"));
  } finally {
    for (const [name, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});

test("omp --version is asked once per window for every caller, again after forgetOmp or a failed answer", async () => {
  if (!posix) return;
  const program = fakeOmp("Current version: 18.12.6\nAlready up to date");
  expect(await ompStatus(program)).toEqual({ missing: false, version: "18.12.6" });
  expect(await ompVersion(program)).toEqual({ missing: false, version: "18.12.6" });
  expect(await ompVersionOutcome(program)).toEqual({ version: "18.12.6" });
  expect(called(true).filter((line) => line === "--version")).toHaveLength(1);
  forgetOmp();
  await ompStatus(program);
  expect(called(true).filter((line) => line === "--version")).toHaveLength(2);
  // A program that is not there answers as missing and is asked again.
  expect(await ompStatus(join(dir, "no-such-omp"))).toEqual({ missing: true, error: `omp not found at ${join(dir, "no-such-omp")}` });
  expect(await ompVersionOutcome(join(dir, "no-such-omp"))).toEqual({ missing: true });
});

test("the wizard's check: a newer version is installed, announced first, and the outcome holds for an hour", async () => {
  if (!posix) return;
  const program = fakeOmp("Current version: 18.12.6\nNew version available: 18.13.0", 0, 0, "18.12.6", "18.13.0");
  const heard: string[] = [];
  expect(await ensureOmpUpdated(program, (version) => heard.push(version))).toEqual({ version: "18.13.0", updated: "18.13.0" });
  expect(heard).toEqual(["18.13.0"]);
  expect(called()).toEqual(["update --check", "update"]);
  expect(await ensureOmpUpdated(program)).toEqual({ version: "18.13.0" });
  expect(called()).toHaveLength(2);
  // Two hours later the check runs again; the version it names is the one omp has, so there is nothing to install.
  expect(await ensureOmpUpdated(program, undefined, process.env, () => Date.now() + 2 * 3600_000)).toEqual({ version: "18.13.0" });
  expect(called()).toEqual(["update --check", "update", "update --check"]);
});

test("a failed update leaves omp as it was and says why, once, and the hour holds; up to date runs nothing more", async () => {
  if (!posix) return;
  const failing = fakeOmp("Current version: 18.12.6\nNew version available: 18.13.0", 3);
  expect(await ensureOmpUpdated(failing)).toEqual({ updateError: "omp update exited with code 3", version: "18.12.6" });
  expect(await ensureOmpUpdated(failing)).toEqual({ version: "18.12.6" });
  expect(called()).toEqual(["update --check", "update"]);
  forgetUpdateCheck();
  const latest = fakeOmp("Current version: 18.12.6\nAlready up to date");
  expect(await ensureOmpUpdated(latest)).toEqual({ version: "18.12.6" });
  expect(called().at(-1)).toBe("update --check");
});

test("a failed check is a failed update with its reason, and a missing program is reported as missing", async () => {
  if (!posix) return;
  expect(await ensureOmpUpdated(fakeOmp("x", 0, 4))).toEqual({ updateError: "omp update --check exited with code 4", version: "18.12.6" });
  forgetUpdateCheck();
  expect(await ensureOmpUpdated(fakeOmp("nothing useful"))).toEqual({ updateError: "omp update --check gave an unexpected answer", version: "18.12.6" });
  expect(await ensureOmpUpdated(join(dir, "no-such-omp"))).toEqual({ missing: true });
});

test("the outcome lives in the global state under its key, and joining a running check does not run a second one", async () => {
  if (!posix) return;
  const kept = keptState();
  const program = fakeOmp("Current version: 18.12.6\nAlready up to date");
  const [a, b] = await Promise.all([ensureOmpUpdated(program), ensureOmpUpdated(program)]);
  expect(a).toEqual(b);
  expect(called()).toEqual(["update --check"]);
  expect(kept.get(OMP_UPDATE_KEY)).toMatchObject({ omp: program, version: "18.12.6" });
  expect(kept.get(OMP_UPDATE_KEY)).not.toHaveProperty("newer");
});

test("the folders omp is looked for in are the PATH, then .bun/bin, then .local/bin of the home", () => {
  expect(ompSearchFolders("/a:/b::/c", "/home/u", ":")).toEqual(["/a", "/b", "/c", join("/home/u", ".bun", "bin"), join("/home/u", ".local", "bin")]);
  expect(ompSearchFolders(undefined, "/home/u")).toEqual([join("/home/u", ".bun", "bin"), join("/home/u", ".local", "bin")]);
});

test("an outcome holds for an hour, for the same program only, and never from the future", () => {
  const at = Date.parse("2026-01-01T10:00:00.000Z");
  const stored = { checkedAt: new Date(at).toISOString(), omp: "/bin/omp", version: "1" };
  expect(checkHolds(stored, "/bin/omp", at + OMP_UPDATE_TTL_MS - 1)).toBe(true);
  expect(checkHolds(stored, "/bin/omp", at + OMP_UPDATE_TTL_MS)).toBe(false);
  expect(checkHolds(stored, "/other/omp", at + 1000)).toBe(false);
  expect(checkHolds(stored, "/bin/omp", at - 1)).toBe(false);
  expect(checkHolds(undefined, "/bin/omp", at)).toBe(false);
});

test("a newer version is installed only while the outcome that found it holds for the program, and not when omp already is that version", () => {
  const at = Date.parse("2026-01-01T10:00:00.000Z");
  const stored = { checkedAt: new Date(at).toISOString(), omp: "/bin/omp", version: "18.12.6", newer: "18.13.0" };
  expect(newerToInstall(stored, "/bin/omp", at + 1000, "18.12.6")).toBe("18.13.0");
  expect(newerToInstall(stored, "/bin/omp", at + 1000)).toBe("18.13.0");
  expect(newerToInstall(stored, "/bin/omp", at + 1000, "18.13.0")).toBeUndefined();
  expect(newerToInstall(stored, "/bin/omp", at + OMP_UPDATE_TTL_MS)).toBeUndefined();
  expect(newerToInstall(stored, "/other/omp", at + 1000)).toBeUndefined();
  expect(newerToInstall({ ...stored, newer: undefined }, "/bin/omp", at + 1000)).toBeUndefined();
  expect(newerToInstall(undefined, "/bin/omp", at)).toBeUndefined();
});

test("a changed program is checked again even within the hour", async () => {
  if (!posix) return;
  const first = fakeOmp("Current version: 18.12.6\nAlready up to date");
  await ensureOmpUpdated(first);
  mkdirSync(join(dir, "other"));
  const other = join(dir, "other", "omp");
  writeFileSync(other, `#!/bin/sh\nif [ "$1" = "--version" ]; then echo 18.12.9; exit 0; fi\necho other >> "${calls}"\nprintf 'Current version: 18.12.9\\nAlready up to date\\n'\n`, { mode: 0o755 });
  expect(await ensureOmpUpdated(other)).toEqual({ version: "18.12.9" });
  expect(called()).toEqual(["update --check", "other"]);
});

test("a launch does not wait for the check: it goes on with the version of omp, the check runs in the background once and writes its outcome with the newer version", async () => {
  if (!posix) return;
  const kept = keptState();
  const program = fakeOmp("Current version: 18.12.6\nNew version available: 18.13.0", 0, 0, "18.12.6", "18.13.0");
  // The check takes a moment, so a launch that waited for it would show.
  writeFileSync(program, readFileSync(program, "utf8").replace('if [ "$1 $2" = "update --check" ]; then', 'if [ "$1 $2" = "update --check" ]; then sleep 0.6;'));
  const started = Date.now();
  const [a, b] = await Promise.all([prepareOmpLaunch(program), prepareOmpLaunch(program)]);
  expect([a, b]).toEqual([{ version: "18.12.6" }, { version: "18.12.6" }]);
  expect(Date.now() - started).toBeLessThan(450);
  expect(kept.get(OMP_UPDATE_KEY)).toBeUndefined();
  await until(() => kept.get(OMP_UPDATE_KEY) !== undefined);
  expect(called()).toEqual(["update --check"]);
  expect(kept.get(OMP_UPDATE_KEY)).toMatchObject({ omp: program, version: "18.12.6", newer: "18.13.0" });
  // The version found is not installed by the check: the next launch installs it and waits for that, and only that.
  const heard: (string | undefined)[] = [];
  expect(await prepareOmpLaunch(program, { updating: (version) => heard.push(version) })).toEqual({ version: "18.13.0", updated: "18.13.0" });
  expect(heard).toEqual(["18.13.0"]);
  expect(called()).toEqual(["update --check", "update"]);
  // The version is read again after the update and `newer` is gone; nothing runs while the outcome holds.
  expect(kept.get(OMP_UPDATE_KEY)).toMatchObject({ omp: program, version: "18.13.0" });
  expect(kept.get(OMP_UPDATE_KEY)).not.toHaveProperty("newer");
  expect(await prepareOmpLaunch(program)).toEqual({ version: "18.13.0" });
  expect(called()).toEqual(["update --check", "update"]);
});

test("launches that find an update under way wait for it and never repeat it", async () => {
  if (!posix) return;
  const kept = keptState();
  const program = fakeOmp("Current version: 18.12.6\nNew version available: 18.13.0", 0, 0, "18.12.6", "18.13.0");
  writeFileSync(program, readFileSync(program, "utf8").replace('if [ "$1" = "update" ]; then', 'if [ "$1" = "update" ]; then sleep 0.2;'));
  prepareOmpLaunch(program);
  await until(() => (kept.get(OMP_UPDATE_KEY) as { newer?: string } | undefined)?.newer !== undefined);
  const heard: (string | undefined)[] = [];
  const outcomes = await Promise.all([prepareOmpLaunch(program, { updating: (version) => heard.push(version) }), prepareOmpLaunch(program, { updating: (version) => heard.push(version) })]);
  expect(outcomes[0]).toBe(outcomes[1] as never);
  expect(outcomes[0]).toEqual({ version: "18.13.0", updated: "18.13.0" });
  expect(heard).toEqual(["18.13.0", "18.13.0"]);
  expect(called().filter((line) => line === "update")).toHaveLength(1);
});

test("a failed background check is told once, to the launch that started it, and holds for the hour; an omp that is recent enough goes on", async () => {
  if (!posix) return;
  const kept = keptState();
  const program = fakeOmp("x", 0, 4);
  const told: string[] = [];
  const hooks = { checkFailed: (reason: string, version?: string) => void told.push(`${reason} | ${version}`) };
  expect(await Promise.all([prepareOmpLaunch(program, hooks), prepareOmpLaunch(program, hooks)])).toEqual([{ version: "18.12.6" }, { version: "18.12.6" }]);
  await until(() => told.length > 0);
  await Bun.sleep(50);
  expect(told).toEqual(["omp update --check exited with code 4 | 18.12.6"]);
  expect(called()).toEqual(["update --check"]);
  expect(kept.get(OMP_UPDATE_KEY)).toMatchObject({ omp: program, version: "18.12.6" });
  expect(await prepareOmpLaunch(program, hooks)).toEqual({ version: "18.12.6" });
  await Bun.sleep(50);
  expect(told).toHaveLength(1);
  expect(called()).toEqual(["update --check"]);
});

test("a failed update of the version a check found keeps the omp of before, says why, and is not tried again within the hour", async () => {
  if (!posix) return;
  const kept = keptState();
  const program = fakeOmp("Current version: 18.12.6\nNew version available: 18.13.0", 3);
  prepareOmpLaunch(program);
  await until(() => (kept.get(OMP_UPDATE_KEY) as { newer?: string } | undefined)?.newer !== undefined);
  expect(await prepareOmpLaunch(program)).toEqual({ updateError: "omp update exited with code 3", version: "18.12.6" });
  expect(await prepareOmpLaunch(program)).toEqual({ version: "18.12.6" });
  expect(called()).toEqual(["update --check", "update"]);
});

test("a missing program stops everything: nothing is checked and the outcome says it is missing", async () => {
  if (!posix) return;
  expect(await prepareOmpLaunch(join(dir, "no-such-omp"))).toEqual({ missing: true });
  expect(called()).toEqual([]);
});

test("an omp older than the minimum, with no check that found a newer version, is updated before the launch; one that stays too old, or whose update fails, comes back tooOld", async () => {
  if (!posix) return;
  const heard: (string | undefined)[] = [];
  const hooks = { updating: (version: string | undefined) => void heard.push(version) };
  expect(await prepareOmpLaunch(fakeOmp("Current version: 18.12.5\nAlready up to date", 0, 0, "18.12.5", "18.13.0"), hooks)).toEqual({ version: "18.13.0", updated: "18.13.0" });
  expect(heard).toEqual([undefined]);
  expect(called()).toEqual(["update"]);
  forgetOmp();
  rmSync(join(dir, "updated"));
  expect(await prepareOmpLaunch(fakeOmp("x", 3, 0, "18.12.5"))).toEqual({ updateError: "omp update exited with code 3", version: "18.12.5", tooOld: true });
  forgetOmp();
  expect(await prepareOmpLaunch(fakeOmp("x", 0, 0, "18.12.5"))).toEqual({ version: "18.12.5", updated: "18.12.5", tooOld: true });
});

test("an omp whose version cannot be read counts as too old, and a failed check of a recent omp does not", async () => {
  if (!posix) return;
  expect(await ensureOmpUpdated(fakeOmp("Current version: 18.12.6\nAlready up to date", 0, 0, ""))).toEqual({ tooOld: true });
  forgetOmp();
  expect(await ensureOmpUpdated(fakeOmp("Current version: 18.12.6\nAlready up to date", 0, 0, "dev build"))).toEqual({ version: "dev build", tooOld: true });
  forgetOmp();
  // A failed update check never stops an omp that is recent enough.
  expect(await ensureOmpUpdated(fakeOmp("x", 0, 4))).toEqual({ updateError: "omp update --check exited with code 4", version: "18.12.6" });
});

test("an omp older than the minimum that the wizard's check finds up to date comes back tooOld with its version; the update that reaches the minimum clears it", async () => {
  if (!posix) return;
  expect(await ensureOmpUpdated(fakeOmp("Current version: 18.12.5\nAlready up to date", 0, 0, "18.12.5"))).toEqual({ version: "18.12.5", tooOld: true });
  // The hour holds the judgment too.
  expect(await ensureOmpUpdated(join(dir, "omp"))).toEqual({ version: "18.12.5", tooOld: true });
  forgetOmp();
  expect(await ensureOmpUpdated(fakeOmp("Current version: 18.12.5\nNew version available: 18.13.0", 3, 0, "18.12.5"))).toEqual({ updateError: "omp update exited with code 3", version: "18.12.5", tooOld: true });
  forgetOmp();
  expect(await ensureOmpUpdated(fakeOmp("Current version: 18.12.5\nNew version available: 18.13.0", 0, 0, "18.12.5", "18.13.0"))).toEqual({ version: "18.13.0", updated: "18.13.0" });
});

/** A fake omp that fails `update --check` with `stderr` (exit 1), answers `--version`, and records the certificate variable it received in the `env` file. */
function certificateOmp(stderr: string): string {
  const program = join(dir, "omp-cert");
  writeFileSync(program, `#!/bin/sh\necho "\${NODE_EXTRA_CA_CERTS:-none}" >> "${join(dir, "env")}"\nif [ "$1" = "--version" ]; then printf '18.12.6'; exit 0; fi\necho '${stderr}' >&2\nexit 1\n`);
  chmodSync(program, 0o755);
  return program;
}

test("a check or an update that fails with a certificate error says so in plain words, whatever the mode; other failures keep their reason", async () => {
  if (!posix) return;
  const program = certificateOmp("Error: unable to get local issuer certificate");
  expect(await ensureOmpUpdated(program, undefined, undefined, undefined, false)).toEqual({ updateError: certificateErrorText(false), version: "18.12.6" });
  forgetUpdateCheck();
  expect(await ensureOmpUpdated(program, undefined, undefined, undefined, true)).toEqual({ updateError: certificateErrorText(true), version: "18.12.6" });
  forgetUpdateCheck();
  expect(await ensureOmpUpdated(certificateOmp("disk full"), undefined, undefined, undefined, true)).toEqual({ updateError: "omp update --check exited with code 1", version: "18.12.6" });

  // The update itself, after a check that found a newer version.
  forgetUpdateCheck();
  const updating = join(dir, "omp-updating");
  writeFileSync(updating, `#!/bin/sh\nif [ "$1" = "--version" ]; then printf '18.12.6'; exit 0; fi\nif [ "$1 $2" = "update --check" ]; then printf 'Current version: 18.12.6\\nNew version available: 18.13.0\\n'; exit 0; fi\necho 'curl: (60) SSL certificate problem' >&2\nexit 1\n`);
  chmodSync(updating, 0o755);
  expect(await ensureOmpUpdated(updating, undefined, undefined, undefined, false)).toEqual({ updateError: certificateErrorText(false), version: "18.12.6" });
});

test("the check, the update and the version reading receive the bundle with System Certificates on and a bundle on disk, and nothing otherwise", async () => {
  if (!posix) return;
  const home = join(dir, "home");
  mkdirSync(home, { recursive: true });
  const saved = { HOME: process.env["HOME"], XDG_CACHE_HOME: process.env["XDG_CACHE_HOME"] };
  process.env["HOME"] = home;
  delete process.env["XDG_CACHE_HOME"];
  try {
    const program = certificateOmp("Error: CERT_HAS_EXPIRED");
    await ensureOmpUpdated(program, undefined, { PATH: process.env["PATH"] ?? "" }, undefined, true);
    expect(readFileSync(join(dir, "env"), "utf8").trim().split("\n")).toEqual(["none", "none"]);
    const path = bundlePath();
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, "bundle\n");
    forgetUpdateCheck();
    rmSync(join(dir, "env"));
    await ensureOmpUpdated(program, undefined, { PATH: process.env["PATH"] ?? "" }, undefined, true);
    expect(readFileSync(join(dir, "env"), "utf8").trim().split("\n")).toEqual([path, path]);
    forgetUpdateCheck();
    rmSync(join(dir, "env"));
    await ensureOmpUpdated(program, undefined, { PATH: process.env["PATH"] ?? "" }, undefined, false);
    expect(readFileSync(join(dir, "env"), "utf8").trim().split("\n")).toEqual(["none", "none"]);
    forgetUpdateCheck();
    rmSync(join(dir, "env"));
    await ompVersionOutcome(program, { PATH: process.env["PATH"] ?? "" }, true);
    expect(readFileSync(join(dir, "env"), "utf8").trim()).toBe(path);
    expect(existsSync(join(dir, "env"))).toBe(true);
  } finally {
    for (const [name, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});
