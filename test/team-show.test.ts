import { afterEach, beforeEach, expect, test } from "bun:test";
import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execute } from "../src/cli/main";
import { addDays, localDate } from "../src/core/people";
import { askTeam, createQuestionServer, QUESTION_ENDPOINT_ENV, TEAM_NEEDS_EDITOR, TEAM_NO_ANSWER, type QuestionServer, type TeamAnswer } from "../src/core/question-channel";
import { unavailableQuestions } from "../src/core/questions";
import { projectAt, type Project } from "../src/core/store";

let root: string;
let dir: string;
let runtimeDir: string;
let p: Project;
let servers: QuestionServer[];
beforeEach(() => {
  // A Unix socket path is limited to about 100 bytes; the system temp directory on macOS is already most of that.
  root = mkdtempSync(process.platform === "win32" ? join(tmpdir(), "trama-tm-") : "/tmp/trama-tm-");
  dir = join(root, "project");
  runtimeDir = join(root, "runtime");
  cpSync(join(import.meta.dir, "../examples/shop"), dir, { recursive: true });
  mkdirSync(runtimeDir);
  p = projectAt(dir);
  servers = [];
});
afterEach(async () => {
  await Promise.all(servers.map((server) => server.dispose()));
  rmSync(root, { recursive: true, force: true });
});

const today = localDate(new Date());

async function window(onTeam?: () => TeamAnswer | Promise<TeamAnswer>, ownsTerminal?: (terminal: string, root: string) => boolean) {
  const created = await createQuestionServer({ project: p, runtimeDir, handler: async () => unavailableQuestions(), onTeam, ownsTerminal });
  servers.push(created);
  return created;
}

const agent = (server: QuestionServer) => ({ [QUESTION_ENDPOINT_ENV]: server.endpoint, TRAMA_TERMINAL: "abc123" });
const show = (env: Record<string, string | undefined>, ...options: string[]) => execute(["--root", dir, "team", "show", ...options], dir, { env, runtimeDir, stdin: async () => "" });

const ada = { name: "Ada Lovelace", handle: "ada", level: "senior", skills: ["typescript", "react"], capacity: 3, absences: [{ from: addDays(today, -20), to: addDays(today, -10) }, { from: addDays(today, 5), to: addDays(today, 9) }, { from: today, to: today }] };
const bob = { name: "bob", handle: "bobby", level: "junior", skills: [], capacity: 1, absences: [] };

test("prints the members ordered by name, with the absences that end today or later", async () => {
  const server = await window(() => ({ members: [bob, ada] }));
  const out = (await show(agent(server))).out;
  expect(out).toContain(`## Ada Lovelace (@ada)\n\n- Level: Senior\n- Skills: typescript, react\n- Capacity: 3 days per sprint\n- Absences: ${today}; ${addDays(today, 5)} to ${addDays(today, 9)}`);
  expect(out).toContain("## bob (@bobby)\n\n- Level: Junior\n- Skills: none\n- Capacity: 1 day per sprint\n- Absences: none");
  expect(out.indexOf("Ada Lovelace")).toBeLessThan(out.indexOf("@bobby"));
  expect(out).not.toContain(addDays(today, -20));
});

test("`--json` is the list of `{ name, handle, level, skills, capacity, absences }` and nothing else", async () => {
  const server = await window(() => ({ members: [{ ...bob, id: "secret", repositories: ["acme/web"] }, ada] }));
  const json = JSON.parse((await show(agent(server), "--json")).out);
  expect(json).toEqual([
    { name: "Ada Lovelace", handle: "ada", level: "senior", skills: ["typescript", "react"], capacity: 3, absences: [{ from: today, to: today }, { from: addDays(today, 5), to: addDays(today, 9) }] },
    bob,
  ]);
});

test("it never writes in the project: not even the short numbers a reading assigns", async () => {
  const server = await window(() => ({ members: [ada] }));
  const assigned = join(dir, ".trama", "short-numbers", "assigned");
  expect(existsSync(assigned)).toBe(false);
  await show(agent(server));
  expect(existsSync(assigned)).toBe(false);
});

test("it never writes in the project", async () => {
  const server = await window(() => ({ members: [ada] }));
  const before = Bun.spawnSync(["find", dir, "-type", "f", "-newer", join(root, "runtime")]).stdout.toString();
  await show(agent(server));
  expect(Bun.spawnSync(["find", dir, "-type", "f", "-newer", join(root, "runtime")]).stdout.toString()).toBe(before);
});

test("without the editor's endpoint or a recognised terminal it needs the editor", async () => {
  const server = await window(() => ({ members: [ada] }));
  await expect(show({})).rejects.toThrow(TEAM_NEEDS_EDITOR);
  await expect(show({ [QUESTION_ENDPOINT_ENV]: server.endpoint })).rejects.toThrow(TEAM_NEEDS_EDITOR);
  await expect(show({ TRAMA_TERMINAL: "abc123" })).rejects.toThrow(TEAM_NEEDS_EDITOR);
  await expect(show({ [QUESTION_ENDPOINT_ENV]: server.endpoint, TRAMA_TERMINAL: "not a terminal!" })).rejects.toThrow(TEAM_NEEDS_EDITOR);
});

test("the window answers only for a terminal it owns", async () => {
  const asked: string[] = [];
  const owns = (terminal: string) => { asked.push(terminal); return terminal === "abc123"; };
  const server = await window(() => ({ members: [ada] }), owns);
  expect((await show(agent(server), "--json")).exit).toBe(0);
  // The other asker reaches a window just like it. On Windows, Bun 1.4.0 sometimes never completes the listen of the next named pipe once a pipe server it ran
  // served this second connection, and the whole run stops there: in the CI runs this file hung at the next test in more than half of the runs, and never with one
  // connection per server. The editor's listener runs in the editor's Node, not in Bun.
  const same = await window(() => ({ members: [ada] }), owns);
  await expect(show({ ...agent(same), TRAMA_TERMINAL: "other1" })).rejects.toThrow(TEAM_NEEDS_EDITOR);
  expect(asked).toEqual(["abc123", "other1"]);
});

test("the reason Team is not available is the failure of the command", async () => {
  const server = await window(() => ({ error: "Manager Mode is off in this working copy." }));
  await expect(show(agent(server))).rejects.toThrow("Manager Mode is off in this working copy.");
  const needs = await window(() => ({ error: "Manager Mode needs a repository on GitHub (the origin remote)." }));
  await expect(show(agent(needs))).rejects.toThrow("Manager Mode needs a repository on GitHub (the origin remote).");
});

test("a window without a team handler, an editor that fails, one that is gone or one that stays silent gives the no answer message", async () => {
  const none = await window();
  await expect(show(agent(none))).rejects.toThrow(TEAM_NO_ANSWER);
  const failing = await window(() => { throw new Error("boom"); });
  await expect(show(agent(failing))).rejects.toThrow(TEAM_NO_ANSWER);
  await expect(show({ [QUESTION_ENDPOINT_ENV]: join(runtimeDir, "gone.sock"), TRAMA_TERMINAL: "abc123" })).rejects.toThrow(TEAM_NO_ANSWER);
  const silent = await window(() => new Promise<TeamAnswer>(() => {}));
  expect(await askTeam(p, { env: agent(silent), runtimeDir, timeoutMs: 300 })).toEqual({ ok: false, reason: TEAM_NO_ANSWER });
});

test("a member the editor sends with a wrong shape is not read", async () => {
  const server = await window(() => ({ members: [{ name: "Ada", handle: "ada" }] }));
  await expect(show(agent(server))).rejects.toThrow(TEAM_NO_ANSWER);
});

test("`--help` prints the usage without contacting the editor", async () => {
  let asked = 0;
  const server = await window(() => { asked++; return { members: [] }; });
  const help = await show(agent(server), "--help");
  expect(help.exit).toBe(0);
  expect(help.out).toContain("trama team show");
  expect(help.out).toContain("Usage: trama team show");
  expect(asked).toBe(0);
});
