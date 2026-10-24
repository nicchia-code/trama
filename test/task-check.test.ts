import { afterEach, beforeEach, expect, test } from "bun:test";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execute } from "../src/cli/main";
import { createQuestionServer, type QuestionServer, type TaskCheckReply } from "../src/core/question-channel";
import { unavailableQuestions } from "../src/core/questions";
import { projectAt, type Project } from "../src/core/store";
import { getTask, moveTask, newTask } from "../src/core/work";

let root: string;
let dir: string;
let runtimeDir: string;
let p: Project;
let servers: QuestionServer[];
beforeEach(() => {
  // A Unix socket path is limited to about 100 bytes; the system temp directory on macOS is already most of that.
  root = mkdtempSync(process.platform === "win32" ? join(tmpdir(), "trama-tc-") : "/tmp/trama-tc-");
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

const run = (id: string, json = false) => execute(["--root", dir, "task", "check", id, ...(json ? ["--json"] : [])], dir, { env: {}, runtimeDir, stdin: async () => "" });
const check = async (id: string, json = false) => {
  const r = await run(id, json);
  return json ? { out: JSON.parse(r.out) as unknown, exit: r.exit } : r;
};
const task = () => newTask(p, { title: "Held", refs: ["order"], technical: false }).id;

async function window(onCheckTask?: (task: string) => TaskCheckReply | Promise<TaskCheckReply>) {
  const created = await createQuestionServer({ project: p, runtimeDir, handler: async () => unavailableQuestions(), onCheckTask });
  servers.push(created);
  return created;
}

test("a Task the agent has not taken is answered without contacting the editor", async () => {
  const asked: string[] = [];
  await window((id) => { asked.push(id); return { result: "alive", holder: "x" }; });
  const free = task();
  const developer = task();
  moveTask(p, developer, "doing", "developer");
  for (const id of [free, developer]) expect((await check(id, true)).out).toEqual({ task: id, result: "not-taken" });
  expect((await check(free)).out).toContain("is not taken by the agent");
  expect(asked).toEqual([]);
});

test("a Task whose file says `agent: true` is held by nobody: not taken by the agent, and nothing changes", async () => {
  const asked: string[] = [];
  await window((id) => { asked.push(id); return { result: "alive", holder: "x" }; });
  const anonymous = task();
  moveTask(p, anonymous, "doing", "developer");
  writeFileSync(getTask(p, anonymous).path, readFileSync(getTask(p, anonymous).path, "utf8").replace(/^agent: false$/m, "agent: true"));
  const before = readFileSync(getTask(p, anonymous).path, "utf8");
  expect(await check(anonymous, true)).toEqual({ out: { task: anonymous, result: "not-taken" }, exit: 0 });
  expect(readFileSync(getTask(p, anonymous).path, "utf8")).toEqual(before);
  expect(asked).toEqual([]);
});

test("a held Task is asked to the window, which answers alive or released", async () => {
  const asked: string[] = [];
  let reply: TaskCheckReply = { result: "alive", holder: "terminal aaa111" };
  await window((id) => { asked.push(id); return reply; });
  const id = task();
  moveTask(p, id, "doing", "agent", { terminal: "aaa111" });
  expect(await check(id, true)).toEqual({ out: { task: id, result: "alive", holder: "terminal aaa111" }, exit: 0 });
  reply = { result: "released", reason: "its terminal is gone" };
  expect(await check(id, true)).toEqual({ out: { task: id, result: "released", reason: "its terminal is gone" }, exit: 0 });
  expect((await check(id)).out).toContain("its terminal is gone");
  expect(asked).toEqual([id, id, id]);
});

test("without an editor, without a handler or without an answer in time the answer is unavailable", async () => {
  const id = task();
  moveTask(p, id, "doing", "agent", { terminal: "aaa111" });
  expect(await check(id, true)).toEqual({ out: { task: id, result: "unavailable" }, exit: 0 });
  await window();
  expect(await check(id, true)).toEqual({ out: { task: id, result: "unavailable" }, exit: 0 });
});

test("a Task that does not exist is an error", async () => {
  await expect(check("zzzzzzzz")).rejects.toThrow();
});
