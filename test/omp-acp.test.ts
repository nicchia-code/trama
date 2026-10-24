import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { modelChoices, permissionOutcome, promptBlocks, reopenMethod, startFailureReason, steeringAnswer, steeringSupported } from "../src/core/omp-acp";

describe("the answer to a permission request", () => {
  test("allow_always first, then allow_once, whatever the order", () => {
    expect(permissionOutcome([{ optionId: "o", kind: "allow_once" }, { optionId: "r", kind: "reject_once" }, { optionId: "a", kind: "allow_always" }])).toEqual({ outcome: "selected", optionId: "a" });
    expect(permissionOutcome([{ optionId: "r", kind: "reject_always" }, { optionId: "o", kind: "allow_once" }])).toEqual({ outcome: "selected", optionId: "o" });
  });
  test("never a rejection: with no allow option the request is left cancelled", () => {
    expect(permissionOutcome([{ optionId: "r", kind: "reject_once" }])).toEqual({ outcome: "cancelled" });
    expect(permissionOutcome([])).toEqual({ outcome: "cancelled" });
  });
});

describe("the reason of a failed start", () => {
  test("omp is not found at the configured path or on the editor's PATH", () => {
    expect(startFailureReason({ kind: "spawn", code: "ENOENT", message: "spawn omp ENOENT" }, "/opt/omp")).toBe("omp not found at /opt/omp");
    expect(startFailureReason({ kind: "spawn", code: "ENOENT", message: "x" }, "")).toBe("omp not found at the editor PATH");
  });
  test("another spawn error says its own message", () => {
    expect(startFailureReason({ kind: "spawn", code: "EACCES", message: "spawn omp EACCES" }, "")).toBe("spawn omp EACCES");
  });
  test("an exit, a silence and omp's own message", () => {
    expect(startFailureReason({ kind: "exit", code: 3, signal: null }, "")).toBe("omp exited with code 3");
    expect(startFailureReason({ kind: "exit", code: null, signal: "SIGKILL" }, "")).toContain("SIGKILL");
    expect(startFailureReason({ kind: "timeout" }, "")).toBe("omp did not answer within 30 s");
    expect(startFailureReason({ kind: "refused", message: "Authentication required" }, "")).toBe("Authentication required");
  });
});

describe("the models of a session", () => {
  const options = [
    { id: "mode", category: "mode", type: "select", currentValue: "default", options: [{ value: "default", name: "Default" }] },
    { id: "model", category: "model", type: "select", currentValue: "a/b", options: [{ value: "a/b", name: "B" }, { value: "a/c" }] },
  ];
  test("the select of category model gives the ids, names and the current one", () => {
    expect(modelChoices(options)).toEqual({ configId: "model", available: [{ id: "a/b", name: "B" }, { id: "a/c", name: "a/c" }], current: "a/b" });
  });
  test("groups are flattened", () => {
    const grouped = [{ id: "m", category: "model", options: [{ group: "g", name: "G", options: [{ value: "x", name: "X" }] }, { value: "y", name: "Y" }] }];
    expect(modelChoices(grouped)?.available.map((model) => model.id)).toEqual(["x", "y"]);
  });
  test("no model option gives undefined", () => {
    expect(modelChoices([options[0]])).toBeUndefined();
    expect(modelChoices(undefined)).toBeUndefined();
  });
});

describe("a prompt's blocks", () => {
  test("text alone", () => {
    expect(promptBlocks("do it")).toEqual([{ type: "text", text: "do it" }]);
  });
  test("an attachment is a resource_link on the file, before the text", () => {
    const file = join(tmpdir(), "a b.md");
    expect(promptBlocks("go", file)).toEqual([
      { type: "resource_link", name: "a b.md", uri: pathToFileURL(file).href },
      { type: "text", text: "go" },
    ]);
  });
});

describe("what omp declares", () => {
  test("steering", () => {
    expect(steeringSupported({ _meta: { steering: { supported: true } } })).toBe(true);
    expect(steeringSupported({ _meta: {} })).toBe(false);
    expect(steeringSupported(undefined)).toBe(false);
  });
  test("the answer to a steering message: injected or promptRequired, anything else is a failure", () => {
    expect(steeringAnswer({ outcome: "injected", queue: "steering" })).toBe("injected");
    expect(steeringAnswer({ outcome: "injected", queue: "followUp" })).toBe("injected");
    expect(steeringAnswer({ outcome: "promptRequired", queue: "steering" })).toBe("promptRequired");
    expect(steeringAnswer({ outcome: "rejected" })).toEqual({ failed: "omp did not take the message" });
    expect(steeringAnswer(undefined)).toEqual({ failed: "omp did not take the message" });
  });
  test("reopening a session: load first, then resume", () => {
    expect(reopenMethod({ agentCapabilities: { loadSession: true, sessionCapabilities: { resume: {} } } })).toBe("load");
    expect(reopenMethod({ agentCapabilities: { sessionCapabilities: { resume: {} } } })).toBe("resume");
    expect(reopenMethod({ agentCapabilities: {} })).toBeUndefined();
  });
});
