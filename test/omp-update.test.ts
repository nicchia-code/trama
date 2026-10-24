import { afterEach, beforeEach, expect, test } from "bun:test";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkHolds, OMP_UPDATE_TTL_MS, ompSearchFolders, readUpdateCheck } from "../src/core/omp-update";
import { ensureOmpUpdated, findConfiguredOmp, findOmp, forgetUpdateCheck, OMP_UPDATE_KEY, setUpdateStore } from "../extension/src/host/omp-update";

const posix = process.platform !== "win32";
let dir = "";
let calls = "";

/** A fake omp whose `update --check` prints `check` and whose `update` exits with `updateCode`; every call is appended to the `calls` file. */
function fakeOmp(check: string, updateCode = 0, checkCode = 0): string {
  const program = join(dir, "omp");
  writeFileSync(program, `#!/bin/sh\necho "$@" >> "${calls}"\nif [ "$1 $2" = "update --check" ]; then printf '%s\\n' '${check}'; exit ${checkCode}; fi\nif [ "$1" = "update" ]; then exit ${updateCode}; fi\nexit 0\n`);
  chmodSync(program, 0o755);
  return program;
}

const called = (): string[] => {
  try {
    return readFileSync(calls, "utf8").trim().split("\n").filter(Boolean);
  } catch {
    return [];
  }
};

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "omp-update-"));
  calls = join(dir, "calls");
  setUpdateStore(undefined);
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

test("a newer version is installed, announced first, and the outcome holds for an hour", async () => {
  if (!posix) return;
  const program = fakeOmp("Current version: 18.12.6\nNew version available: 18.13.0");
  const heard: string[] = [];
  expect(await ensureOmpUpdated(program, (version) => heard.push(version))).toEqual({ version: "18.13.0", updated: "18.13.0" });
  expect(heard).toEqual(["18.13.0"]);
  expect(called()).toEqual(["update --check", "update"]);
  expect(await ensureOmpUpdated(program)).toEqual({ version: "18.13.0" });
  expect(called()).toHaveLength(2);
  expect(await ensureOmpUpdated(program, undefined, process.env, () => Date.now() + 2 * 3600_000)).toEqual({ version: "18.13.0", updated: "18.13.0" });
  expect(called()).toHaveLength(4);
});

test("a failed update leaves omp as it was and says why; up to date runs nothing more", async () => {
  if (!posix) return;
  const failing = fakeOmp("Current version: 18.12.6\nNew version available: 18.13.0", 3);
  expect(await ensureOmpUpdated(failing)).toEqual({ updateError: "omp update exited with code 3", version: "18.12.6" });
  forgetUpdateCheck();
  const latest = fakeOmp("Current version: 18.12.6\nAlready up to date");
  expect(await ensureOmpUpdated(latest)).toEqual({ version: "18.12.6" });
  expect(called().at(-1)).toBe("update --check");
});

test("a failed check is a failed update with its reason, and a missing program is reported as missing", async () => {
  if (!posix) return;
  expect(await ensureOmpUpdated(fakeOmp("x", 0, 4))).toEqual({ updateError: "omp update --check exited with code 4" });
  forgetUpdateCheck();
  expect(await ensureOmpUpdated(fakeOmp("nothing useful"))).toEqual({ updateError: "omp update --check gave an unexpected answer" });
  expect(await ensureOmpUpdated(join(dir, "no-such-omp"))).toEqual({ missing: true });
});

test("the outcome lives in the global state under its key, and joining a running check does not run a second one", async () => {
  if (!posix) return;
  const kept = new Map<string, unknown>();
  setUpdateStore({ get: <T,>(key: string) => kept.get(key) as T | undefined, update: async (key, value) => void kept.set(key, value) });
  const program = fakeOmp("Current version: 18.12.6\nAlready up to date");
  const [a, b] = await Promise.all([ensureOmpUpdated(program), ensureOmpUpdated(program)]);
  expect(a).toEqual(b);
  expect(called()).toEqual(["update --check"]);
  expect(kept.get(OMP_UPDATE_KEY)).toMatchObject({ omp: program, version: "18.12.6" });
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

test("a changed program is checked again even within the hour", async () => {
  if (!posix) return;
  const first = fakeOmp("Current version: 18.12.6\nAlready up to date");
  await ensureOmpUpdated(first);
  mkdirSync(join(dir, "other"));
  const other = join(dir, "other", "omp");
  writeFileSync(other, `#!/bin/sh\necho other >> "${calls}"\nprintf 'Current version: 9\\nAlready up to date\\n'\n`, { mode: 0o755 });
  expect(await ensureOmpUpdated(other)).toEqual({ version: "9" });
  expect(called()).toEqual(["update --check", "other"]);
});
