import { expect, test } from "bun:test";
import { parseToHost } from "../extension/src/host/messages";

const ok = (message: unknown) => {
  const parsed = parseToHost(message);
  if (!parsed.ok) throw new Error(parsed.reason);
  return parsed.message;
};

test("accepts every well-formed message of the contract", () => {
  expect(ok({ type: "ready" })).toEqual({ type: "ready" });
  expect(ok({ type: "writeDesignRequest" })).toEqual({ type: "writeDesignRequest" });
  expect(ok({ type: "launch", action: { kind: "design" } })).toEqual({ type: "launch", action: { kind: "design" } });
  expect(ok({ type: "launch", action: { kind: "design", prompt: "x" } })).toEqual({ type: "launch", action: { kind: "design", prompt: "x" } });
  expect(ok({ type: "launch", action: { kind: "scan", feature: "checkout" } })).toEqual({ type: "launch", action: { kind: "scan", feature: "checkout" } });
  expect(ok({ type: "launch", action: { kind: "scan" } })).toEqual({ type: "launch", action: { kind: "scan" } });
  expect(ok({ type: "launch", action: { kind: "implement", task: "0003" } })).toEqual({ type: "launch", action: { kind: "implement", task: "0003" } });
  expect(ok({ type: "launch", action: { kind: "implement-all" } })).toEqual({ type: "launch", action: { kind: "implement-all" } });
  expect(ok({ type: "launch", action: { kind: "implement-design", proposal: "0007" } })).toEqual({ type: "launch", action: { kind: "implement-design", proposal: "0007" } });
  expect(ok({ type: "launch", action: { kind: "resolve-drifts" } })).toEqual({ type: "launch", action: { kind: "resolve-drifts" } });
  expect(ok({ type: "openModelFile", path: "checkout/order.md" })).toEqual({ type: "openModelFile", path: "checkout/order.md" });
  expect(ok({ type: "openFile", path: "tasks/0003-x.md" })).toEqual({ type: "openFile", path: "tasks/0003-x.md" });
  expect(ok({ type: "approveProposal", id: "0001" })).toEqual({ type: "approveProposal", id: "0001" });
  expect(ok({ type: "rejectProposal", id: "0001" })).toEqual({ type: "rejectProposal", id: "0001" });
});

test("drops fields that are not part of the contract", () => {
  expect(ok({ type: "approveProposal", id: "0001", force: true })).toEqual({ type: "approveProposal", id: "0001" });
});

test("rejects unknown types, wrong shapes and IDs that are not plain IDs; moving and taking back a Task and the worktree round messages are unknown", () => {
  const rejected: unknown[] = [
    { type: "moveTask", id: "0003", column: "doing" },
    { type: "takeBackTask", id: "0003" },
    { type: "driftBlocked", id: "0002" },
    { type: "resolveDrift", id: "0002", how: "dismiss" },
    { type: "resolveDrift", id: "0002", how: "fix-code", option: 2, note: "x" },
    { type: "launch", action: { kind: "rework-drift", drift: "0003" } },
    null,
    "ready",
    [],
    {},
    { type: 3 },
    { type: "format-disk" },
    { type: "launch" },
    { type: "launch", action: { kind: "run", command: "rm -rf /" } },
    { type: "launch", action: { kind: "design", prompt: 3 } },
    { type: "launch", action: { kind: "fix", prompt: "The cart total ignores the coupon" } },
    { type: "launch", action: { kind: "scan", feature: "a`; rm -rf /; `" } },
    { type: "launch", action: { kind: "implement", task: 3 } },
    { type: "launch", action: { kind: "implement-design" } },
    { type: "launch", action: { kind: "implement-design", proposal: "0007`; rm -rf /; `" } },
    { type: "openFile" },
    { type: "openFile", path: "" },
    { type: "openModelFile", path: 7 },
    { type: "setMultiBranch", on: true },
    { type: "withdrawFromRound", id: "0001" },
    { type: "abandonRound" },
    { type: "approveProposal", id: "" },
    { type: "rejectProposal", id: { toString: "x" } },
  ];
  for (const message of rejected) expect(parseToHost(message).ok).toBe(false);
});

test("openLink accepts only http and https addresses", () => {
  expect(ok({ type: "openLink", url: "https://example.com/a" })).toEqual({ type: "openLink", url: "https://example.com/a" });
  for (const url of ["javascript:alert(1)", "file:///etc/passwd", "docs/x.md", "", 3]) expect(parseToHost({ type: "openLink", url }).ok).toBe(false);
  expect(parseToHost({ type: "openLink" }).ok).toBe(false);
});
