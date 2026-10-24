import { describe, expect, test } from "bun:test";
import { linuxStartTime, processStartTime, psStartTime, windowsStartTime } from "../src/core/process-start";

describe("reading the start of a process", () => {
  test("Linux: field 22 of /proc/<pid>/stat in ticks since the boot instant of /proc/stat, whatever the command name holds", () => {
    const fields = Array.from({ length: 30 }, (_, index) => String(index + 3));
    // Field 22 is the 20th after the closing parenthesis of the name (fields 3, 4, … start there).
    fields[19] = "123456";
    const stat = `42 (a (weird) name) ${fields.join(" ")}`;
    expect(linuxStartTime(stat, "cpu 1 2 3\nbtime 1700000000\nprocesses 9")).toBe(1_700_000_000_000 + 1_234_560);
  });

  test("Linux: a missing boot instant or a start that is no number says nothing", () => {
    const fields = Array.from({ length: 30 }, () => "1");
    expect(linuxStartTime(`1 (x) ${fields.join(" ")}`, "cpu 1")).toBeUndefined();
    fields[19] = "soon";
    expect(linuxStartTime(`1 (x) ${fields.join(" ")}`, "btime 5")).toBeUndefined();
  });

  test("macOS: the local date `ps -o lstart=` prints", () => {
    expect(psStartTime("Sat Oct 24 14:42:09 2026\n")).toBe(new Date(2026, 9, 24, 14, 42, 9).getTime());
    expect(psStartTime("")).toBeUndefined();
    expect(psStartTime("not a date")).toBeUndefined();
  });

  test("Windows: the Unix time in milliseconds PowerShell prints", () => {
    expect(windowsStartTime("1700000000123\r\n")).toBe(1_700_000_000_123);
    expect(windowsStartTime("")).toBeUndefined();
    expect(windowsStartTime("Cannot find a process")).toBeUndefined();
    expect(windowsStartTime("-5")).toBeUndefined();
  });

  test("the process running now has a start near now, read again to the same second; a process number that does not exist has none", async () => {
    const first = await processStartTime(process.pid);
    expect(first).toBeDefined();
    // `bun test` runs with its own time zone, which `ps` does not know: only a day's distance is certain.
    expect(Math.abs(first! - Date.now())).toBeLessThan(24 * 3600 * 1000);
    expect(Math.abs((await processStartTime(process.pid))! - first!)).toBeLessThanOrEqual(1000);
    expect(await processStartTime(2_000_000_000)).toBeUndefined();
    expect(await processStartTime(0)).toBeUndefined();
    expect(await processStartTime(-3)).toBeUndefined();
  });
});
