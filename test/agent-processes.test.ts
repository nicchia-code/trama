import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { processAlive, readAgentProcess, readAgentProcesses, removeAgentProcess, sameProcess, writeAgentProcess } from "../src/core/agent-processes";
import { processStartTime } from "../src/core/process-start";
import { terminalVerdict } from "../src/core/terminal-check";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-agents-"));
  if (process.platform !== "win32") Bun.spawnSync(["chmod", "700", dir]);
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("agent process registry", () => {
  test("registers, replaces and removes the process of a terminal, leaving no temporary file but the folder of the locks", async () => {
    await writeAgentProcess("p1", "t1", 111, "w1", dir);
    await writeAgentProcess("p1", "t2", 222, undefined, dir);
    await writeAgentProcess("p1", "t1", 333, "w2", dir);
    expect(readAgentProcess("p1", "t1", dir)?.pid).toBe(333);
    expect(readAgentProcess("p1", "t1", dir)?.window).toBe("w2");
    expect(readAgentProcess("p1", "t2", dir)?.pid).toBe(222);
    expect(readAgentProcess("p1", "t2", dir)?.window).toBeUndefined();
    expect(Number.isNaN(Date.parse(readAgentProcess("p1", "t1", dir)!.started))).toBe(false);
    removeAgentProcess("p1", "t1", dir);
    removeAgentProcess("p1", "t2", dir);
    expect(readdirSync(dir)).toEqual([".locks"]);
  });

  test("the registrations of several writers at once are all kept", async () => {
    await Promise.all(Array.from({ length: 8 }, (_, index) => writeAgentProcess("p1", `t${index}`, 100 + index, `w${index}`, dir)));
    expect(Object.keys(readAgentProcesses("p1", dir)!).sort()).toEqual(Array.from({ length: 8 }, (_, index) => `t${index}`));
  });

  test("a project's file is its own", async () => {
    await writeAgentProcess("p1", "t1", 111, "w1", dir);
    expect(readAgentProcess("p2", "t1", dir)).toBeUndefined();
    expect(readAgentProcesses("p2", dir)).toEqual({});
  });

  test("an unreadable file says nothing and is left alone", async () => {
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "agents-p1.json"), "{nope");
    expect(readAgentProcesses("p1", dir)).toBeUndefined();
    await writeAgentProcess("p1", "t1", 111, "w1", dir);
    expect(readAgentProcess("p1", "t1", dir)).toBeUndefined();
  });

  test("an entry written by an earlier version has no start and reads back as such", () => {
    writeFileSync(join(dir, "agents-p1.json"), JSON.stringify({ t1: { pid: 5, started: "2026-01-01T00:00:00.000Z" } }));
    expect(readAgentProcess("p1", "t1", dir)).toEqual({ pid: 5, started: "2026-01-01T00:00:00.000Z" });
  });
});

describe("the same process", () => {
  const registered = (pid: number, processStart?: string) => ({ pid, started: new Date().toISOString(), ...(processStart === undefined ? {} : { processStart }) });

  test("a live process whose start is the registered one is the same", async () => {
    const entry = registered(process.pid, new Date((await processStartTime(process.pid))!).toISOString());
    expect(await sameProcess(entry)).toBe(true);
  });

  test("the start may differ by two seconds, not by more", async () => {
    const start = (await processStartTime(process.pid))!;
    expect(await sameProcess(registered(process.pid, new Date(start + 1500).toISOString()))).toBe(true);
    expect(await sameProcess(registered(process.pid, new Date(start - 3000).toISOString()))).toBe(false);
  });

  test("a number reused by another program holds nothing", async () => {
    expect(await sameProcess(registered(process.pid, "2001-01-01T00:00:00.000Z"))).toBe(false);
  });

  test("no entry, an entry without a start and a start that is no date are gone", async () => {
    expect(await sameProcess(undefined)).toBe(false);
    expect(await sameProcess(registered(process.pid))).toBe(false);
    expect(await sameProcess(registered(process.pid, "not a date"))).toBe(false);
  });

  test("a process that ended is gone", async () => {
    const child = spawn(process.execPath, ["-e", "setTimeout(()=>{},30000)"]);
    const start = await processStartTime(child.pid!);
    const entry = registered(child.pid!, start === undefined ? undefined : new Date(start).toISOString());
    expect(start).toBeDefined();
    expect(await sameProcess(entry)).toBe(true);
    const exited = new Promise((done) => child.once("exit", done));
    child.kill("SIGKILL");
    await exited;
    expect(await sameProcess(entry)).toBe(false);
  });
});

describe("liveness and verdict", () => {
  test("a running process is alive and a reaped one is not", async () => {
    const child = spawn(process.execPath, ["-e", "setTimeout(()=>{},30000)"]);
    expect(processAlive(child.pid!)).toBe(true);
    const exited = new Promise((done) => child.once("exit", done));
    child.kill("SIGKILL");
    await exited;
    expect(processAlive(child.pid!)).toBe(false);
  });

  test("the terminal gone wins; the hook's process wins over the shell's; no process is a doubt", () => {
    const dead = () => false;
    const live = () => true;
    expect(terminalVerdict({ terminalGone: true, hookPid: 1 }, live)).toBe("the terminal is gone");
    expect(terminalVerdict({ terminalGone: false, hookPid: 1, shellPid: 2 }, (pid) => pid === 2)).toBe("the agent's process is gone");
    expect(terminalVerdict({ terminalGone: false, shellPid: 2 }, dead)).toBe("the agent's process is gone");
    expect(terminalVerdict({ terminalGone: false, hookPid: 1 }, live)).toBeUndefined();
    expect(terminalVerdict({ terminalGone: false }, dead)).toBeUndefined();
  });
});
