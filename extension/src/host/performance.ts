import * as vscode from "vscode";
import { measured, measuring, setPerformanceSink, tramaPath } from "../../../src/core/performance";

/** The Output channel of the diagnostics (`quality#General`): always on, created at the activation, never brought forward by itself (`show` is never called). */
export const PERFORMANCE_CHANNEL = "Trama Performance";

/** Starts the channel: every operation of the host that takes longer than 200 ms writes one line to it. Writing a line starts no process and reads no file. */
export function startPerformanceChannel(): vscode.Disposable {
  const channel = vscode.window.createOutputChannel(PERFORMANCE_CHANNEL);
  setPerformanceSink((line) => channel.appendLine(line));
  return {
    dispose: () => {
      setPerformanceSink(undefined);
      channel.dispose();
    },
  };
}

/** The name of a message of a view: its `type`, never the content of the message. */
export function messageName(raw: unknown): string {
  const type = typeof raw === "object" && raw !== null && "type" in raw ? raw.type : undefined;
  return typeof type === "string" ? type : "message";
}

/**
 * `watcher` whose events are operations of the host started by a change of files: each listener runs measured, named by the path under `.trama/` that changed. The
 * watcher is otherwise the same one, so whoever receives it measures its events without knowing.
 */
export function measuredWatcher(watcher: vscode.FileSystemWatcher): vscode.FileSystemWatcher {
  const events = new Set<PropertyKey>(["onDidCreate", "onDidChange", "onDidDelete"]);
  return new Proxy(watcher, {
    get(target, property) {
      const value: unknown = Reflect.get(target, property, target);
      if (events.has(property) && typeof value === "function") {
        return (listener: (uri: vscode.Uri) => unknown, thisArgs?: unknown, disposables?: vscode.Disposable[]) =>
          (value as (...args: unknown[]) => vscode.Disposable).call(target, measuring("file change", (uri: vscode.Uri) => tramaPath(uri.fsPath), listener), thisArgs, disposables);
      }
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}

/** An event of the editor (a change of tab, of window, of settings, a command) as an operation of the host. */
export const editorEvent = <A extends unknown[], R>(name: string, listener: (...args: A) => R) => measuring("editor", name, listener);

/** The work of a timer as an operation of the host. */
export const timerWork = <T>(name: string, work: () => T): T => measured("timer", name, work);
