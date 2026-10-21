import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { processAlive, readAgentProcess, readAgentProcesses, removeAgentProcess, writeAgentProcess } from "../src/core/agent-processes";
import { terminalVerdict } from "../src/core/terminal-check";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-agents-"));
  if (process.platform !== "win32") Bun.spawnSync(["chmod", "700", dir]);
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("agent process registry", () => {
  test("registers, replaces and removes the process of a terminal, leaving no temporary file", () => {
    writeAgentProcess("p1", "t1", 111, dir);
    writeAgentProcess("p1", "t2", 222, dir);
    writeAgentProcess("p1", "t1", 333, dir);
    expect(readAgentProcess("p1", "t1", dir)?.pid).toBe(333);
    expect(readAgentProcess("p1", "t2", dir)?.pid).toBe(222);
    expect(Number.isNaN(Date.parse(readAgentProcess("p1", "t1", dir)!.started))).toBe(false);
    removeAgentProcess("p1", "t1", dir);
    removeAgentProcess("p1", "t2", dir);
    expect(readdirSync(dir)).toEqual([]);
  });

  test("a project's file is its own", () => {
    writeAgentProcess("p1", "t1", 111, dir);
    expect(readAgentProcess("p2", "t1", dir)).toBeUndefined();
    expect(readAgentProcesses("p2", dir)).toEqual({});
  });

  test("an unreadable file says nothing and is left alone", () => {
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "agents-p1.json"), "{nope");
    expect(readAgentProcesses("p1", dir)).toBeUndefined();
    writeAgentProcess("p1", "t1", 111, dir);
    expect(readAgentProcess("p1", "t1", dir)).toBeUndefined();
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
