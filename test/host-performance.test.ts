import { afterEach, beforeEach, expect, mock, spyOn, test } from "bun:test";

// The channel `Trama Performance`: created by `createOutputChannel`, written with `appendLine` and never shown.
const channel = { appended: [] as string[], shown: 0, disposed: false, appendLine: (line: string) => void channel.appended.push(line), show: () => void channel.shown++, dispose: () => void (channel.disposed = true) };
const names: string[] = [];
mock.module("vscode", () => ({
  window: {
    createOutputChannel: (name: string) => {
      names.push(name);
      return channel;
    },
  },
}));

// Dynamic imports: they must come after `mock.module`, which has to be in place before these modules load.
const { messageName, measuredWatcher, startPerformanceChannel, PERFORMANCE_CHANNEL } = await import("../extension/src/host/performance");
const { measured, processStarted } = await import("../src/core/performance");

let now: number;
beforeEach(() => {
  now = 5_000_000;
  spyOn(Date, "now").mockImplementation(() => now);
  channel.appended.length = 0;
  channel.shown = 0;
  channel.disposed = false;
  names.length = 0;
});
afterEach(() => {
  spyOn(Date, "now").mockRestore();
});

test("the channel is the Output channel `Trama Performance`, empty when started and never brought forward", () => {
  const started = startPerformanceChannel();
  expect(names).toEqual([PERFORMANCE_CHANNEL]);
  expect(PERFORMANCE_CHANNEL).toBe("Trama Performance");
  measured("panel", "fast", () => {
    now += 10;
  });
  expect(channel.appended).toEqual([]);
  measured("panel", "slow", () => {
    const ended = processStarted("git");
    now += 250;
    ended();
  });
  expect(channel.appended).toHaveLength(1);
  expect(channel.appended[0]).toContain("panel | slow | 250 ms | processes: git 250 ms");
  expect(channel.shown).toBe(0);
  started.dispose();
  expect(channel.disposed).toBe(true);
  // After that nothing is measured.
  measured("panel", "later", () => {
    now += 500;
  });
  expect(channel.appended).toHaveLength(1);
});

test("a message of a view is named by its type, never by its content", () => {
  expect(messageName({ type: "createTask", title: "a secret prompt" })).toBe("createTask");
  expect(messageName({ title: "no type" })).toBe("message");
  expect(messageName("text")).toBe("message");
  expect(messageName(null)).toBe("message");
});

test("the events of a watcher are operations started by a change of files, named by the path under `.trama/`", () => {
  const started = startPerformanceChannel();
  const listeners: Array<(uri: { fsPath: string }) => void> = [];
  const real = {
    onDidCreate: (listener: (uri: { fsPath: string }) => void) => (listeners.push(listener), { dispose() {} }),
    onDidChange: () => ({ dispose() {} }),
    onDidDelete: () => ({ dispose() {} }),
    dispose: () => void (channel.disposed = true),
  };
  const watched = measuredWatcher(real as never);
  const seen: string[] = [];
  watched.onDidCreate((uri) => {
    seen.push(uri.fsPath);
    now += 300;
  });
  listeners[0]?.({ fsPath: "/home/dev/shop/.trama/tasks/a1b2c3d4-task.md" });
  expect(seen).toEqual(["/home/dev/shop/.trama/tasks/a1b2c3d4-task.md"]);
  expect(channel.appended).toHaveLength(1);
  expect(channel.appended[0]).toContain("file change | .trama/tasks/a1b2c3d4-task.md | 300 ms");
  expect(channel.appended[0]).not.toContain("/home/dev");
  channel.disposed = false;
  watched.dispose();
  expect(channel.disposed).toBe(true);
  started.dispose();
});
