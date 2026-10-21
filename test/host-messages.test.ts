import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseToHost } from "../extension/src/host/messages";
import { settingsSchema } from "../extension/src/host/settings-schema";

const ok = (message: unknown) => {
  const parsed = parseToHost(message);
  if (!parsed.ok) throw new Error(parsed.reason);
  return parsed.message;
};

test("accepts every well-formed message of the contract", () => {
  expect(ok({ type: "ready" })).toEqual({ type: "ready" });
  expect(ok({ type: "writeDesignRequest" })).toEqual({ type: "writeDesignRequest" });
  expect(ok({ type: "launch", action: { kind: "scan", feature: "checkout" } })).toEqual({ type: "launch", action: { kind: "scan", feature: "checkout" } });
  expect(ok({ type: "launch", action: { kind: "scan" } })).toEqual({ type: "launch", action: { kind: "scan" } });
  expect(ok({ type: "launch", action: { kind: "implement", task: "0003" } })).toEqual({ type: "launch", action: { kind: "implement", task: "0003" } });
  expect(ok({ type: "launch", action: { kind: "implement-all" } })).toEqual({ type: "launch", action: { kind: "implement-all" } });
  expect(parseToHost({ type: "launch", action: { kind: "resolve-drifts" } })).toEqual({ ok: false, reason: "resolve-drifts needs a valid Drift ID" });
  expect(ok({ type: "launch", action: { kind: "resolve-drifts", drift: "ab12cd34" } })).toEqual({ type: "launch", action: { kind: "resolve-drifts", drift: "ab12cd34" } });
  expect(parseToHost({ type: "launch", action: { kind: "resolve-drifts", drift: "../x" } })).toEqual({ ok: false, reason: "resolve-drifts needs a valid Drift ID" });
  expect(ok({ type: "launch", action: { kind: "import" } })).toEqual({ type: "launch", action: { kind: "import" } });
  expect(ok({ type: "openModelFile", path: "checkout/order.md" })).toEqual({ type: "openModelFile", path: "checkout/order.md" });
  expect(ok({ type: "openFile", path: "tasks/0003-x.md" })).toEqual({ type: "openFile", path: "tasks/0003-x.md" });
  expect(ok({ type: "openCard", kind: "drift", id: "drift-1" })).toEqual({ type: "openCard", kind: "drift", id: "drift-1" });
  expect(ok({ type: "openCard", kind: "task", id: "task-1" })).toEqual({ type: "openCard", kind: "task", id: "task-1" });
  expect(ok({ type: "approveProposal", id: "0001" })).toEqual({ type: "approveProposal", id: "0001" });
  expect(ok({ type: "rejectProposal", id: "0001" })).toEqual({ type: "rejectProposal", id: "0001" });
  expect(ok({ type: "dismissDrift", id: "0001" })).toEqual({ type: "dismissDrift", id: "0001" });
  expect(ok({ type: "setProposalModel", proposal: "0001", model: "gpt-5" })).toEqual({ type: "setProposalModel", proposal: "0001", model: "gpt-5" });
  expect(ok({ type: "setProposalModel", proposal: "0001", model: "" })).toEqual({ type: "setProposalModel", proposal: "0001", model: "" });
});

test("the command palette offers no design command, only import", async () => {
  const { contributes } = await Bun.file(new URL("../extension/package.json", import.meta.url)).json();
  const commands = (contributes.commands as { command: string }[]).map((c) => c.command);
  expect(commands).not.toContain("trama.design");
  expect(commands).toContain("trama.import");
});

test("drops fields that are not part of the contract", () => {
  expect(ok({ type: "approveProposal", id: "0001", force: true })).toEqual({ type: "approveProposal", id: "0001" });
});

test("rejects unknown types, wrong shapes and IDs that are not plain IDs; move and take-back messages are unknown", () => {
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
    { type: "openFile" },
    { type: "openFile", path: "" },
    { type: "openModelFile", path: 7 },
    { type: "openCard", kind: "proposal", id: "0001" },
    { type: "openCard", kind: "drift", id: "../secret" },
    { type: "setMultiBranch", on: true },
    { type: "withdrawFromRound", id: "0001" },
    { type: "abandonRound" },
    { type: "approveProposal", id: "" },
    { type: "rejectProposal", id: { toString: "x" } },
  ];
  for (const message of rejected) expect(parseToHost(message).ok).toBe(false);
});

test("setProposalModel needs a Proposal identity and a model text", () => {
  for (const proposal of [undefined, "", "../secret", 3]) expect(parseToHost({ type: "setProposalModel", proposal, model: "gpt-5" }).ok).toBe(false);
  for (const model of [undefined, 3]) expect(parseToHost({ type: "setProposalModel", proposal: "0001", model }).ok).toBe(false);
});

test("dismissDrift needs a Drift identity", () => {
  for (const id of [undefined, "", "../secret", 3]) expect(parseToHost({ type: "dismissDrift", id }).ok).toBe(false);
});

test("openLink accepts only http and https addresses", () => {
  expect(ok({ type: "openLink", url: "https://example.com/a" })).toEqual({ type: "openLink", url: "https://example.com/a" });
  for (const url of ["javascript:alert(1)", "file:///etc/passwd", "docs/x.md", "", 3]) expect(parseToHost({ type: "openLink", url }).ok).toBe(false);
  expect(parseToHost({ type: "openLink" }).ok).toBe(false);
});

test("the messages of the setup wizard are checked: the choice, the agent, the folder and the paths", () => {
  expect(ok({ type: "openGuidedSetup", choice: "import" })).toEqual({ type: "openGuidedSetup", choice: "import" });
  expect(ok({ type: "openGuidedSetup", choice: "scratch" })).toEqual({ type: "openGuidedSetup", choice: "scratch" });
  for (const choice of ["", "both", undefined, 1]) expect(parseToHost({ type: "openGuidedSetup", choice }).ok).toBe(false);
  expect(parseToHost({ type: "initialize", choice: "import" }).ok).toBe(false);

  expect(ok({ type: "agentCheckWanted", agent: "omp", ompPath: "/bin/omp" })).toEqual({ type: "agentCheckWanted", agent: "omp", ompPath: "/bin/omp" });
  for (const agent of ["chat", undefined, 1]) expect(parseToHost({ type: "agentCheckWanted", agent, ompPath: "" }).ok).toBe(false);
  expect(parseToHost({ type: "agentCheckWanted", agent: "omp" }).ok).toBe(false);

  expect(ok({ type: "modelSuggestionsWanted" })).toEqual({ type: "modelSuggestionsWanted" });
  expect(ok({ type: "modelSuggestionsWanted", agent: "cursor", ompPath: "" })).toEqual({ type: "modelSuggestionsWanted", agent: "cursor", ompPath: "" });
  expect(parseToHost({ type: "modelSuggestionsWanted", agent: "cursor" }).ok).toBe(false);

  expect(ok({ type: "folderChildrenWanted", root: "/work/app", path: "" })).toEqual({ type: "folderChildrenWanted", root: "/work/app", path: "" });
  expect(ok({ type: "folderChildrenWanted", root: "/work/app", path: "src/core" })).toEqual({ type: "folderChildrenWanted", root: "/work/app", path: "src/core" });
  for (const path of ["../x", "/etc", "a/../b", "a//b", "C:/x", 3]) expect(parseToHost({ type: "folderChildrenWanted", root: "/work/app", path }).ok).toBe(false);
  expect(parseToHost({ type: "folderChildrenWanted", root: "", path: "" }).ok).toBe(false);
});

test("confirmSetup carries the mode, the path, the folder, only wizard keys that conform to the manifest, and safe excluded paths", () => {
  const manifest = JSON.parse(readFileSync(join(import.meta.dir, "../extension/package.json"), "utf8"));
  const schema = settingsSchema(manifest);
  const parse = (message: Record<string, unknown>) => parseToHost({ type: "confirmSetup", values: [], excluded: [], ...message }, schema);
  const good = parse({ mode: "first", choice: "import", root: "/work/app", values: [{ key: "trama.agent", value: "omp" }, { key: "trama.maxParallelAgents", value: 4 }], excluded: ["docs", "src/old"] });
  expect(good).toEqual({
    ok: true,
    message: { type: "confirmSetup", mode: "first", choice: "import", root: "/work/app", values: [{ key: "trama.agent", value: "omp" }, { key: "trama.maxParallelAgents", value: 4 }], excluded: ["docs", "src/old"] },
  });
  expect(parse({ mode: "settings" })).toEqual({ ok: true, message: { type: "confirmSetup", mode: "settings", values: [], excluded: [] } });
  expect(parse({ mode: "empty-model", choice: "scratch" })).toEqual({ ok: true, message: { type: "confirmSetup", mode: "empty-model", choice: "scratch", values: [], excluded: [] } });
  // The first setup needs its folder, and the modes with a path need the choice.
  expect(parse({ mode: "first", choice: "import" }).ok).toBe(false);
  expect(parse({ mode: "empty-model" }).ok).toBe(false);
  expect(parse({ mode: "other", choice: "import" }).ok).toBe(false);
  // A key outside the steps of the wizard (the language), an unknown key and a value that does not conform are refused.
  expect(parse({ mode: "settings", values: [{ key: "trama.language", value: "Italian" }] }).ok).toBe(false);
  expect(parse({ mode: "settings", values: [{ key: "trama.nope", value: 1 }] }).ok).toBe(false);
  expect(parse({ mode: "settings", values: [{ key: "trama.maxParallelAgents", value: 0 }] }).ok).toBe(false);
  expect(parse({ mode: "settings", values: [{ key: "trama.agent", value: "claude" }] }).ok).toBe(false);
  // Excluded paths stay inside the folder and cannot break the quoted instruction.
  for (const path of ["../x", "/abs", "a/../b", "a`b", "a\nb", "", "a//b"]) expect(parse({ mode: "settings", excluded: [path] }).ok).toBe(false);
});
