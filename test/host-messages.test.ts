import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseToHost } from "../extension/src/host/messages";
import { OMP_LOGIN_PROVIDERS } from "../extension/src/omp-login";
import { settingsSchema } from "../extension/src/host/settings-schema";

const ok = (message: unknown) => {
  const parsed = parseToHost(message);
  if (!parsed.ok) throw new Error(parsed.reason);
  return parsed.message;
};

test("accepts every well-formed message of the contract", () => {
  expect(ok({ type: "ready" })).toEqual({ type: "ready" });
  expect(ok({ type: "writeDesignRequest" })).toEqual({ type: "writeDesignRequest" });
  expect(ok({ type: "writeHandoffRequest" })).toEqual({ type: "writeHandoffRequest" });
  expect(parseToHost({ type: "openQuickTask" })).toEqual({ ok: false, reason: 'unknown message type "openQuickTask"' });
  expect(parseToHost({ type: "launch", action: { kind: "scan" } })).toEqual({ ok: false, reason: 'unknown action "scan"' });
  expect(parseToHost({ type: "launch", action: { kind: "scan", feature: "checkout" } })).toEqual({ ok: false, reason: 'unknown action "scan"' });
  // The scan after a merge and the reconciling of a merge start only from the host.
  expect(parseToHost({ type: "launch", action: { kind: "mergeScan", base: "aaaa1111", incoming: "bbbb2222" } })).toEqual({ ok: false, reason: 'unknown action "mergeScan"' });
  expect(parseToHost({ type: "launch", action: { kind: "reconcileMerge", branch: "main" } })).toEqual({ ok: false, reason: 'unknown action "reconcileMerge"' });
  expect(ok({ type: "launch", action: { kind: "implement", task: "0003" } })).toEqual({ type: "launch", action: { kind: "implement", task: "0003" } });
  expect(ok({ type: "launch", action: { kind: "implement-all" } })).toEqual({ type: "launch", action: { kind: "implement-all" } });
  expect(parseToHost({ type: "launch", action: { kind: "resolve-drifts" } })).toEqual({ ok: false, reason: "resolve-drifts needs a valid Drift ID" });
  expect(ok({ type: "launch", action: { kind: "resolve-drifts", drift: "ab12cd34" } })).toEqual({ type: "launch", action: { kind: "resolve-drifts", drift: "ab12cd34" } });
  expect(parseToHost({ type: "launch", action: { kind: "resolve-drifts", drift: "../x" } })).toEqual({ ok: false, reason: "resolve-drifts needs a valid Drift ID" });
  expect(ok({ type: "launch", action: { kind: "unify-drifts" } })).toEqual({ type: "launch", action: { kind: "unify-drifts" } });
  expect(ok({ type: "launch", action: { kind: "import" } })).toEqual({ type: "launch", action: { kind: "import" } });
  expect(ok({ type: "openModelFile", path: "checkout/order.md" })).toEqual({ type: "openModelFile", path: "checkout/order.md" });
  expect(ok({ type: "openFile", path: "tasks/0003-x.md" })).toEqual({ type: "openFile", path: "tasks/0003-x.md" });
  expect(ok({ type: "openCard", kind: "drift", id: "drift-1" })).toEqual({ type: "openCard", kind: "drift", id: "drift-1" });
  expect(ok({ type: "openCard", kind: "task", id: "task-1" })).toEqual({ type: "openCard", kind: "task", id: "task-1" });
  expect(ok({ type: "approveProposal", id: "0001" })).toEqual({ type: "approveProposal", id: "0001" });
  expect(ok({ type: "rejectProposal", id: "0001" })).toEqual({ type: "rejectProposal", id: "0001" });
  expect(ok({ type: "reworkProposal", proposal: "0001" })).toEqual({ type: "reworkProposal", proposal: "0001" });
  expect(ok({ type: "reworkDrift", drift: "0001" })).toEqual({ type: "reworkDrift", drift: "0001" });
  for (const bad of [undefined, "", "../x"]) {
    expect(parseToHost({ type: "reworkProposal", proposal: bad }).ok).toBe(false);
    expect(parseToHost({ type: "reworkDrift", drift: bad }).ok).toBe(false);
  }
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

test("openTaskImage is accepted only for an image the Task has", () => {
  const has = (task: string, name: string) => task === "abcd1234" && name === "shot.png";
  expect(parseToHost({ type: "openTaskImage", task: "abcd1234", name: "shot.png" }, [], has)).toEqual({ ok: true, message: { type: "openTaskImage", task: "abcd1234", name: "shot.png" } });
  for (const message of [{ task: "abcd1234", name: "other.png" }, { task: "zzzzzzzz", name: "shot.png" }, { task: "abcd1234" }, { name: "shot.png" }, { task: "../x", name: "shot.png" }, { task: "abcd1234", name: "" }, { task: 5, name: 5 }]) {
    expect(parseToHost({ type: "openTaskImage", ...message }, [], has).ok).toBe(false);
  }
  expect(parseToHost({ type: "openTaskImage", task: "abcd1234", name: "shot.png" }).ok).toBe(false);
});

test("ompLogin is accepted only with a provider of the fixed list and an omp path that is text, when there is one", () => {
  for (const { id } of OMP_LOGIN_PROVIDERS) expect(ok({ type: "ompLogin", provider: id })).toEqual({ type: "ompLogin", provider: id });
  expect(ok({ type: "ompLogin", provider: "anthropic", ompPath: "/opt/omp" })).toEqual({ type: "ompLogin", provider: "anthropic", ompPath: "/opt/omp" });
  expect(ok({ type: "ompLogin", provider: "anthropic", ompPath: "" })).toEqual({ type: "ompLogin", provider: "anthropic", ompPath: "" });
  for (const provider of ["openai", "xai", "ANTHROPIC", "anthropic; rm -rf /", "", undefined, 3, null, "constructor"]) expect(parseToHost({ type: "ompLogin", provider }).ok).toBe(false);
  for (const ompPath of [3, null, ["x"]]) expect(parseToHost({ type: "ompLogin", provider: "anthropic", ompPath }).ok).toBe(false);
  expect(OMP_LOGIN_PROVIDERS.map((provider) => provider.id)).toEqual(["openai-codex", "anthropic", "github-copilot", "google-gemini-cli", "google-antigravity", "cursor", "xai-oauth"]);
});

test("ompLogout is accepted only with a provider of the fixed list and an omp path that is text, when there is one", () => {
  for (const { id } of OMP_LOGIN_PROVIDERS) expect(ok({ type: "ompLogout", provider: id })).toEqual({ type: "ompLogout", provider: id });
  expect(ok({ type: "ompLogout", provider: "anthropic", ompPath: "/opt/omp" })).toEqual({ type: "ompLogout", provider: "anthropic", ompPath: "/opt/omp" });
  expect(ok({ type: "ompLogout", provider: "anthropic", ompPath: "" })).toEqual({ type: "ompLogout", provider: "anthropic", ompPath: "" });
  for (const provider of ["openai", "xai", "ANTHROPIC", "anthropic; rm -rf /", "", undefined, 3, null, "constructor"]) expect(parseToHost({ type: "ompLogout", provider }).ok).toBe(false);
  for (const ompPath of [3, null, ["x"]]) expect(parseToHost({ type: "ompLogout", provider: "anthropic", ompPath }).ok).toBe(false);
  // Nothing else survives: the id is the one of the list, whatever else the message carries.
  expect(ok({ type: "ompLogout", provider: "anthropic", extra: "x" })).toEqual({ type: "ompLogout", provider: "anthropic" });
});

test("setCursorApiKey and removeCursorApiKey carry at most an omp path as text, and no other field survives, never a key", () => {
  for (const type of ["setCursorApiKey", "removeCursorApiKey"] as const) {
    expect(ok({ type })).toEqual({ type });
    expect(ok({ type, ompPath: "/opt/omp" })).toEqual({ type, ompPath: "/opt/omp" });
    expect(ok({ type, ompPath: "" })).toEqual({ type, ompPath: "" });
    // A key (or any other field) sent along is dropped: the message has no field for it.
    expect(ok({ type, ompPath: "/opt/omp", key: "sk-secret", apiKey: "sk-secret", value: "sk-secret" })).toEqual({ type, ompPath: "/opt/omp" });
    expect(ok({ type, key: "sk-secret" })).toEqual({ type });
    for (const ompPath of [3, null, ["x"], { path: "x" }, "x".repeat(100_000)]) expect(parseToHost({ type, ompPath }).ok).toBe(false);
  }
});

test("agentCheckWanted, installOmp and ompLogin carry the wizard step's systemCertificates only as a boolean, and the two requests of the state carry no data", () => {
  for (const systemCertificates of [true, false]) {
    expect(ok({ type: "agentCheckWanted", ompPath: "/bin/omp", systemCertificates })).toEqual({ type: "agentCheckWanted", ompPath: "/bin/omp", systemCertificates });
    expect(ok({ type: "installOmp", systemCertificates })).toEqual({ type: "installOmp", systemCertificates });
    expect(ok({ type: "ompLogin", provider: "anthropic", systemCertificates })).toEqual({ type: "ompLogin", provider: "anthropic", systemCertificates });
    expect(ok({ type: "ompLogin", provider: "anthropic", ompPath: "/opt/omp", systemCertificates })).toEqual({ type: "ompLogin", provider: "anthropic", ompPath: "/opt/omp", systemCertificates });
  }
  for (const systemCertificates of ["true", 1, null, {}, []]) {
    expect(parseToHost({ type: "agentCheckWanted", ompPath: "", systemCertificates }).ok).toBe(false);
    expect(parseToHost({ type: "installOmp", systemCertificates }).ok).toBe(false);
    expect(parseToHost({ type: "ompLogin", provider: "anthropic", systemCertificates }).ok).toBe(false);
  }
  expect(ok({ type: "installOmp" })).toEqual({ type: "installOmp" });
  expect(ok({ type: "agentCheckWanted", ompPath: "" })).toEqual({ type: "agentCheckWanted", ompPath: "" });
  // Neither request carries a field that could choose the sources, the path or the processes: whatever else is sent is dropped.
  for (const type of ["refreshSystemCertificates", "systemCertificatesExport"] as const) {
    expect(ok({ type })).toEqual({ type });
    expect(ok({ type, path: "/tmp/x.pem", source: "login", systemCertificates: true })).toEqual({ type });
  }
});

test("trama.systemCertificates is a boolean setting of the manifest: setSetting takes a boolean only", () => {
  const manifest = JSON.parse(readFileSync(join(import.meta.dir, "../extension/package.json"), "utf8"));
  const schema = settingsSchema(manifest);
  expect(parseToHost({ type: "setSetting", key: "trama.systemCertificates", value: true }, schema)).toEqual({ ok: true, message: { type: "setSetting", key: "trama.systemCertificates", value: true } });
  for (const value of ["true", 1, null]) expect(parseToHost({ type: "setSetting", key: "trama.systemCertificates", value }, schema).ok).toBe(false);
});

test("setNtfyToken, removeNtfyToken and sendTestNotification carry no field at all: a token or a server sent along is dropped", () => {
  for (const type of ["setNtfyToken", "removeNtfyToken", "sendTestNotification"] as const) {
    expect(ok({ type })).toEqual({ type });
    expect(ok({ type, token: "tk_secret", value: "tk_secret", topic: "mytopic", url: "https://evil.example" })).toEqual({ type });
  }
});

test("trama.ntfyServer and trama.ntfyTopic are text settings with a validity: setSetting refuses a value that is not valid, and an empty one is accepted", () => {
  const manifest = JSON.parse(readFileSync(join(import.meta.dir, "../extension/package.json"), "utf8"));
  const schema = settingsSchema(manifest);
  const setting = (key: string, value: unknown) => parseToHost({ type: "setSetting", key, value }, schema);
  for (const value of ["", "https://ntfy.example.org", "http://localhost:8080"]) expect(setting("trama.ntfyServer", value).ok, String(value)).toBe(true);
  for (const value of ["ntfy.sh", "ftp://ntfy.sh", "https://user:pass@ntfy.sh", "https://ntfy.sh?x=1", "https://ntfy.sh#a", 5, null]) expect(setting("trama.ntfyServer", value).ok, String(value)).toBe(false);
  expect(setting("trama.ntfyServer", "ntfy.sh")).toEqual({ ok: false, reason: "trama.ntfyServer: Enter an http or https address without user name or password." });
  for (const value of ["", "my-topic_01", "a".repeat(64)]) expect(setting("trama.ntfyTopic", value).ok, String(value)).toBe(true);
  for (const value of ["with space", "a".repeat(65), "a/b", "é", 5, null]) expect(setting("trama.ntfyTopic", value).ok, String(value)).toBe(false);
  expect(setting("trama.ntfyTopic", "bad topic")).toEqual({ ok: false, reason: "trama.ntfyTopic: Use 1 to 64 letters, digits, - or _." });
});

test("the messages of the setup wizard are checked: the choice, the agent, the folder and the paths", () => {
  expect(ok({ type: "openGuidedSetup", choice: "import" })).toEqual({ type: "openGuidedSetup", choice: "import" });
  expect(ok({ type: "openGuidedSetup", choice: "scratch" })).toEqual({ type: "openGuidedSetup", choice: "scratch" });
  for (const choice of ["", "both", undefined, 1]) expect(parseToHost({ type: "openGuidedSetup", choice }).ok).toBe(false);
  expect(parseToHost({ type: "initialize", choice: "import" }).ok).toBe(false);

  expect(ok({ type: "agentCheckWanted", ompPath: "/bin/omp" })).toEqual({ type: "agentCheckWanted", ompPath: "/bin/omp" });
  expect(ok({ type: "agentCheckWanted", ompPath: "" })).toEqual({ type: "agentCheckWanted", ompPath: "" });
  for (const ompPath of [undefined, 1]) expect(parseToHost({ type: "agentCheckWanted", ompPath }).ok).toBe(false);
  expect(ok({ type: "installOmp" })).toEqual({ type: "installOmp" });

  expect(ok({ type: "instructionFilesWanted" })).toEqual({ type: "instructionFilesWanted" });
  expect(ok({ type: "instructionFilesWanted", root: "/work/app" })).toEqual({ type: "instructionFilesWanted", root: "/work/app" });
  for (const root of ["", 3, null]) expect(parseToHost({ type: "instructionFilesWanted", root }).ok).toBe(false);
  expect(ok({ type: "openInstructionFile", path: "/work/app/AGENTS.md" })).toEqual({ type: "openInstructionFile", path: "/work/app/AGENTS.md" });
  for (const path of ["", 3, undefined]) expect(parseToHost({ type: "openInstructionFile", path }).ok).toBe(false);

  expect(ok({ type: "modelSuggestionsWanted" })).toEqual({ type: "modelSuggestionsWanted" });
  expect(ok({ type: "modelSuggestionsWanted", ompPath: "/bin/omp" })).toEqual({ type: "modelSuggestionsWanted", ompPath: "/bin/omp" });
  expect(parseToHost({ type: "modelSuggestionsWanted", ompPath: 3 }).ok).toBe(false);

  expect(ok({ type: "folderChildrenWanted", root: "/work/app", path: "" })).toEqual({ type: "folderChildrenWanted", root: "/work/app", path: "" });
  expect(ok({ type: "folderChildrenWanted", root: "/work/app", path: "src/core" })).toEqual({ type: "folderChildrenWanted", root: "/work/app", path: "src/core" });
  for (const path of ["../x", "/etc", "a/../b", "a//b", "C:/x", 3]) expect(parseToHost({ type: "folderChildrenWanted", root: "/work/app", path }).ok).toBe(false);
  expect(parseToHost({ type: "folderChildrenWanted", root: "", path: "" }).ok).toBe(false);
});

test("confirmSetup carries the mode, the path, the folder, only wizard keys that conform to the manifest, and safe excluded paths", () => {
  const manifest = JSON.parse(readFileSync(join(import.meta.dir, "../extension/package.json"), "utf8"));
  const schema = settingsSchema(manifest);
  const parse = (message: Record<string, unknown>) => parseToHost({ type: "confirmSetup", values: [], excluded: [], ...message }, schema);
  const good = parse({ mode: "first", choice: "import", root: "/work/app", values: [{ key: "trama.ompPath", value: "/bin/omp" }, { key: "trama.maxParallelAgents", value: 4 }], excluded: ["docs", "src/old"] });
  expect(good).toEqual({
    ok: true,
    message: { type: "confirmSetup", mode: "first", choice: "import", root: "/work/app", values: [{ key: "trama.ompPath", value: "/bin/omp" }, { key: "trama.maxParallelAgents", value: 4 }], excluded: ["docs", "src/old"] },
  });
  expect(parse({ mode: "settings" })).toEqual({ ok: true, message: { type: "confirmSetup", mode: "settings", values: [], excluded: [] } });
  expect(parse({ mode: "empty-model", choice: "scratch" })).toEqual({ ok: true, message: { type: "confirmSetup", mode: "empty-model", choice: "scratch", values: [], excluded: [] } });
  // The first setup needs its folder, and the modes with a path need the choice.
  expect(parse({ mode: "first", choice: "import" }).ok).toBe(false);
  expect(parse({ mode: "empty-model" }).ok).toBe(false);
  expect(parse({ mode: "other", choice: "import" }).ok).toBe(false);
  // The language is a wizard key now (its step asks it), so it is accepted; autoExit stays out of the wizard, an unknown key and a value that does not conform are refused.
  expect(parse({ mode: "settings", values: [{ key: "trama.language", value: "Italian" }] }).ok).toBe(true);
  // System Certificates is a key of the omp step: a boolean is accepted, anything else is refused.
  expect(parse({ mode: "settings", values: [{ key: "trama.systemCertificates", value: true }] }).ok).toBe(true);
  expect(parse({ mode: "settings", values: [{ key: "trama.systemCertificates", value: "yes" }] }).ok).toBe(false);
  expect(parse({ mode: "settings", values: [{ key: "trama.autoExit", value: true }] }).ok).toBe(false);
  expect(parse({ mode: "settings", values: [{ key: "trama.nope", value: 1 }] }).ok).toBe(false);
  expect(parse({ mode: "settings", values: [{ key: "trama.maxParallelAgents", value: 0 }] }).ok).toBe(false);
  expect(parse({ mode: "settings", values: [{ key: "trama.terminalLocation", value: "nowhere" }] }).ok).toBe(false);
  // Excluded paths stay inside the folder and cannot break the quoted instruction.
  for (const path of ["../x", "/abs", "a/../b", "a`b", "a\nb", "", "a//b"]) expect(parse({ mode: "settings", excluded: [path] }).ok).toBe(false);
});

test("reworkDrift needs a Drift identity", () => {
  expect(parseToHost({ type: "reworkDrift", drift: "0001" })).toEqual({ ok: true, message: { type: "reworkDrift", drift: "0001" } });
  for (const drift of [undefined, "", "../secret", 3]) expect(parseToHost({ type: "reworkDrift", drift }).ok).toBe(false);
});

test("clearDone carries the Task identities of the Done column as they are, and needs a list of them", () => {
  expect(ok({ type: "clearDone", tasks: ["aaaaaaaa", "bbbbbbbb"] })).toEqual({ type: "clearDone", tasks: ["aaaaaaaa", "bbbbbbbb"] });
  expect(ok({ type: "clearDone", tasks: [] })).toEqual({ type: "clearDone", tasks: [] });
  for (const tasks of [undefined, "aaaaaaaa", 3, null, { 0: "aaaaaaaa" }, ["aaaaaaaa", 3], ["aaaaaaaa", undefined], ["../x"], [""]]) {
    expect(parseToHost({ type: "clearDone", tasks }).ok).toBe(false);
  }
});

test("deleteTask carries one Task identity as it is, and a missing or invalid one makes the message invalid", () => {
  expect(ok({ type: "deleteTask", task: "aaaaaaaa" })).toEqual({ type: "deleteTask", task: "aaaaaaaa" });
  for (const task of [undefined, null, 3, ["aaaaaaaa"], { id: "aaaaaaaa" }, "", "../x", "a b", "aaaaaaaa/../b"]) {
    expect(parseToHost({ type: "deleteTask", task }).ok).toBe(false);
  }
  expect(parseToHost({ type: "deleteTask", id: "aaaaaaaa" }).ok).toBe(false);
});

test("askMore needs a Task, Proposal or Drift identity, and a question action needs its question's ID", () => {
  expect(ok({ type: "askMore", kind: "task", id: "j6tlxyad" })).toEqual({ type: "askMore", kind: "task", id: "j6tlxyad" });
  expect(ok({ type: "askMore", kind: "drift", id: "d1d1d1d1" })).toEqual({ type: "askMore", kind: "drift", id: "d1d1d1d1" });
  expect(parseToHost({ type: "askMore", kind: "question", id: "j6tlxyad" }).ok).toBe(false);
  expect(parseToHost({ type: "askMore", kind: "drift" }).ok).toBe(false);
  expect(ok({ type: "questionAction", round: 3, action: { type: "askMore", id: "q1" } })).toEqual({ type: "questionAction", round: 3, action: { type: "askMore", id: "q1" } });
  expect(parseToHost({ type: "questionAction", round: 3, action: { type: "askMore", id: "" } }).ok).toBe(false);
});

test("refineAll and cancelRefineAll carry no field, and cancelRefinement needs a Proposal identity", () => {
  expect(ok({ type: "refineAll" })).toEqual({ type: "refineAll" });
  expect(ok({ type: "refineAll", force: true })).toEqual({ type: "refineAll" });
  expect(ok({ type: "cancelRefineAll" })).toEqual({ type: "cancelRefineAll" });
  expect(ok({ type: "cancelRefineAll", proposal: "0001" })).toEqual({ type: "cancelRefineAll" });
  expect(ok({ type: "cancelRefinement", proposal: "0001" })).toEqual({ type: "cancelRefinement", proposal: "0001" });
  expect(parseToHost({ type: "cancelRefinement" }).ok).toBe(false);
});

test("viewChanged needs the name of a view of the panel", () => {
  expect(ok({ type: "viewChanged", view: "specs" })).toEqual({ type: "viewChanged", view: "specs" });
  expect(ok({ type: "viewChanged", view: "getstarted" })).toEqual({ type: "viewChanged", view: "getstarted" });
  expect(ok({ type: "viewChanged", view: "history" })).toEqual({ type: "viewChanged", view: "history" });
  for (const view of ["nowhere", "", 3, undefined, null]) expect(parseToHost({ type: "viewChanged", view }).ok).toBe(false);
});

test("setSoloMode carries one of the three kinds and nothing else; confirmSetup carries solo only in the modes that have it", () => {
  for (const solo of ["off", "folders", "files"] as const) expect(ok({ type: "setSoloMode", solo })).toEqual({ type: "setSoloMode", solo });
  for (const solo of ["on", "", undefined, true, null, "Folders"]) expect(parseToHost({ type: "setSoloMode", solo }).ok).toBe(false);
  const parse = (message: Record<string, unknown>) => parseToHost({ type: "confirmSetup", values: [], excluded: [], ...message });
  expect(parse({ mode: "first", choice: "scratch", root: "/work/app", solo: "files" })).toEqual({ ok: true, message: { type: "confirmSetup", mode: "first", choice: "scratch", root: "/work/app", values: [], solo: "files", excluded: [] } });
  expect(parse({ mode: "empty-model", choice: "import", solo: "off" })).toEqual({ ok: true, message: { type: "confirmSetup", mode: "empty-model", choice: "import", values: [], solo: "off", excluded: [] } });
  expect(parse({ mode: "first", choice: "scratch", root: "/work/app" })).toEqual({ ok: true, message: { type: "confirmSetup", mode: "first", choice: "scratch", root: "/work/app", values: [], excluded: [] } });
  expect(parse({ mode: "first", choice: "scratch", root: "/work/app", solo: "everything" }).ok).toBe(false);
  expect(parse({ mode: "settings", solo: "folders" }).ok).toBe(false);
});

test("setManagerMode carries a boolean and nothing else; confirmSetup carries manager in every mode, as a boolean", () => {
  for (const on of [true, false]) expect(ok({ type: "setManagerMode", on })).toEqual({ type: "setManagerMode", on });
  for (const on of ["true", 1, 0, "", undefined, null]) expect(parseToHost({ type: "setManagerMode", on }).ok).toBe(false);
  const parse = (message: Record<string, unknown>) => parseToHost({ type: "confirmSetup", values: [], excluded: [], ...message });
  expect(parse({ mode: "first", choice: "scratch", root: "/work/app", manager: true })).toEqual({ ok: true, message: { type: "confirmSetup", mode: "first", choice: "scratch", root: "/work/app", values: [], manager: true, excluded: [] } });
  expect(parse({ mode: "settings", manager: false })).toEqual({ ok: true, message: { type: "confirmSetup", mode: "settings", values: [], manager: false, excluded: [] } });
  expect(parse({ mode: "empty-model", choice: "import", manager: true })).toEqual({ ok: true, message: { type: "confirmSetup", mode: "empty-model", choice: "import", values: [], manager: true, excluded: [] } });
  expect(parse({ mode: "settings" })).toEqual({ ok: true, message: { type: "confirmSetup", mode: "settings", values: [], excluded: [] } });
  for (const manager of ["on", 1, null]) expect(parse({ mode: "settings", manager }).ok).toBe(false);
});

test("linkGitHubProject carries the owner and a positive whole number; the four other GitHub messages carry nothing", () => {
  expect(ok({ type: "linkGitHubProject", owner: "acme", number: 3 })).toEqual({ type: "linkGitHubProject", owner: "acme", number: 3 });
  for (const bad of [{ owner: "", number: 3 }, { owner: "acme", number: 0 }, { owner: "acme", number: -1 }, { owner: "acme", number: 1.5 }, { owner: "acme", number: "3" }, { owner: 7, number: 3 }, { number: 3 }, { owner: "acme" }]) {
    expect(parseToHost({ type: "linkGitHubProject", ...bad }).ok).toBe(false);
  }
  for (const type of ["unlinkGitHubProject", "refreshTeam", "logInGitHub", "showGitHubDetails"] as const) expect(ok({ type })).toEqual({ type });
});

test("savePerson carries a person of a sane shape, whose values the host checks; the four other people messages carry the ID of a person", () => {
  const person = { name: "Ada Lovelace", handle: "@ada", level: "senior" as const, skills: ["Rust"], capacity: 4.5, absences: [{ from: "2026-11-10", to: "2026-11-12" }] };
  expect(ok({ type: "savePerson", person })).toEqual({ type: "savePerson", person });
  expect(ok({ type: "savePerson", person: { ...person, id: "ab12cd34" } })).toEqual({ type: "savePerson", person: { ...person, id: "ab12cd34" } });
  // A value outside `rules#person` is not the parser's to refuse: the host answers with the message of each field.
  expect(ok({ type: "savePerson", person: { ...person, level: "chief", capacity: 99 } }).type).toBe("savePerson");
  for (const bad of [
    undefined,
    null,
    [],
    { ...person, id: "AB" },
    { ...person, name: 3 },
    { ...person, handle: undefined },
    { ...person, capacity: "5" },
    { ...person, skills: "Rust" },
    { ...person, skills: [1] },
    { ...person, absences: [{ from: "2026-11-10" }] },
    { ...person, absences: "none" },
    { ...person, name: "x".repeat(10_000) },
  ])
    expect(parseToHost({ type: "savePerson", person: bad }).ok).toBe(false);
  for (const type of ["addToTeam", "removeFromTeam", "undoRemoveFromTeam", "deletePerson"] as const) {
    expect(ok({ type, id: "ab12cd34" })).toEqual({ type, id: "ab12cd34" });
    for (const id of [undefined, "", "AB12CD34", "ab12cd3", "../x", 7]) expect(parseToHost({ type, id }).ok).toBe(false);
  }
});

test("Comment update and Scan of an issue carry the issue's identity and nothing else", () => {
  expect(ok({ type: "askIssueUpdate", issue: "abcd1234" })).toEqual({ type: "askIssueUpdate", issue: "abcd1234" });
  expect(ok({ type: "scanIssue", issue: "abcd1234" })).toEqual({ type: "scanIssue", issue: "abcd1234" });
  for (const type of ["askIssueUpdate", "scanIssue"]) {
    for (const bad of [undefined, 126, "", "../../etc", "ab cd", "x".repeat(101)]) expect(parseToHost({ type, issue: bad }).ok).toBe(false);
    expect(parseToHost({ type }).ok).toBe(false);
  }
});
