import { afterEach, beforeEach, expect, spyOn, test } from "bun:test";
import { measured, measuring, performanceLine, processStarted, setPerformanceSink, SLOW_MS, tramaPath } from "../src/core/performance";

let lines: string[];
let now: number;
beforeEach(() => {
  lines = [];
  now = 1_000_000;
  spyOn(Date, "now").mockImplementation(() => now);
  setPerformanceSink((line) => lines.push(line));
});
afterEach(() => {
  setPerformanceSink(undefined);
  spyOn(Date, "now").mockRestore();
});

test("an operation that takes no more than 200 ms writes nothing", () => {
  measured("panel", "refresh", () => {
    now += SLOW_MS;
  });
  expect(lines).toEqual([]);
});

test("a slower operation writes one line: when it ended, what started it, what it did and how long it took", () => {
  measured("panel", "createTask", () => {
    now += SLOW_MS + 1;
  });
  expect(lines).toHaveLength(1);
  expect(lines[0]).toMatch(/^\d{2}:\d{2}:\d{2}\.\d{3} panel \| createTask \| 201 ms$/);
});

test("every process an operation starts is on its line with its own duration, by program name only", () => {
  measured("launch", "implement-all", () => {
    const git = processStarted("/usr/bin/git");
    now += 120;
    git();
    const omp = processStarted("C:\\Users\\dev\\bin\\omp.exe");
    now += 130;
    omp();
  });
  expect(lines).toHaveLength(1);
  expect(lines[0]).toEndWith("launch | implement-all | 250 ms | processes: git 120 ms, omp 130 ms");
  expect(lines[0]).not.toContain("/usr");
  expect(lines[0]).not.toContain("Users");
});

test("an operation that is asynchronous is measured until it settles, and a failing one still writes its line", async () => {
  const gate = Promise.withResolvers<void>();
  const running = measured("view", "showLog", async () => {
    await gate.promise;
  });
  now += 500;
  gate.resolve();
  await running;
  expect(lines).toHaveLength(1);
  expect(lines[0]).toContain("view | showLog | 500 ms");

  lines.length = 0;
  const failing = measured("timer", "check", async () => {
    now += 300;
    throw new Error("nope");
  });
  await expect(failing).rejects.toThrow("nope");
  expect(lines).toHaveLength(1);
  expect(lines[0]).toContain("timer | check | 300 ms");
  expect(lines[0]).not.toContain("nope");
});

test("an operation started inside another is part of it: one line, with the processes of both", () => {
  measured("file change", ".trama/tasks/a.md", () => {
    const outer = processStarted("git");
    now += 100;
    outer();
    measured("timer", "inner", () => {
      const inner = processStarted("gh");
      now += 150;
      inner();
    });
  });
  expect(lines).toHaveLength(1);
  expect(lines[0]).toContain("file change | .trama/tasks/a.md | 250 ms | processes: git 100 ms, gh 150 ms");
});

test("a process that ends after its operation did gets a line of its own only when it is slow", () => {
  let endFast = () => {};
  let endSlow = () => {};
  measured("editor", "save", () => {
    endFast = processStarted("git");
    endSlow = processStarted("omp");
  });
  now += 50;
  endFast();
  expect(lines).toEqual([]);
  now += 400;
  endSlow();
  expect(lines).toHaveLength(1);
  expect(lines[0]).toContain("editor | save (later) | 450 ms | processes: omp 450 ms");
});

test("a listener wrapped by `measuring` is named by its arguments and gives back what it returns", () => {
  const listener = measuring("file change", (path: string) => path, (path: string) => {
    now += 300;
    return path.length;
  });
  expect(listener(".trama/a.md")).toBe(11);
  expect(lines).toHaveLength(1);
  expect(lines[0]).toContain("file change | .trama/a.md | 300 ms");
});

test("without a sink nothing is measured and the work runs as it is", () => {
  setPerformanceSink(undefined);
  expect(measured("panel", "x", () => 7)).toBe(7);
  expect(processStarted("git")()).toBeUndefined();
  expect(lines).toEqual([]);
});

test("only a path under `.trama/` can reach the channel", () => {
  expect(tramaPath("/home/dev/shop/.trama/tasks/a1b2c3d4-x.md")).toBe(".trama/tasks/a1b2c3d4-x.md");
  expect(tramaPath("C:\\work\\shop\\.trama\\requests\\2026-01-01T00-00-00.md")).toBe(".trama/requests/2026-01-01T00-00-00.md");
  expect(tramaPath("/home/dev/shop")).toBe("(outside .trama)");
  expect(performanceLine(new Date(2026, 0, 2, 3, 4, 5, 6), "timer", "x", 12.4, [])).toBe("03:04:05.006 timer | x | 12 ms");
});
