import { expect, test } from "bun:test";
import { agentCommandLine } from "../extension/src/host/quote";
import { agentTemplate, effectiveAgent, roleOf, subAgentSentence } from "../extension/src/host/terminal-agent";

const none = { analysis: "", scan: "", execution: "" };
const all = { analysis: "opus", scan: "it's", execution: "haiku" };

test("the effective agent is the chosen one, else custom with a command, else none", () => {
  expect(effectiveAgent(" claude ", "x {prompt}")).toBe("claude");
  expect(effectiveAgent("", "x {prompt}")).toBe("custom");
  expect(effectiveAgent("", "  ")).toBeUndefined();
  expect(effectiveAgent("custom", "")).toBe("custom");
});

test("each instruction's terminal name gives its role", () => {
  expect(["Design", "Import", "Scan", "T3", "P2", "All tasks", "abc12345"].map(roleOf)).toEqual(["analysis", "analysis", "scan", "execution", "execution", "execution", "execution"]);
});

test("known agents pass --model only with a role set, quoted for the shell", () => {
  const line = (agent: Parameters<typeof agentTemplate>[0], role: Parameters<typeof agentTemplate>[2], models = all) => agentCommandLine(agentTemplate(agent, "", role, models, "posix"), "go", "posix");
  expect(line("codex", "scan")).toBe(`codex --model 'it'\\''s' 'go'`);
  expect(line("copilot", "analysis")).toBe("copilot --model 'opus' -i 'go'");
  expect(line("cursor", "execution", none)).toBe("agent 'go'");
  expect(line("copilot", "scan", none)).toBe("copilot -i 'go'");
});

test("omp gets the sub-agents' roles only for instructions that can scan and only when set", () => {
  expect(agentTemplate("omp", "", "execution", all, "posix")).toBe("omp --model 'haiku' --smol 'haiku' --slow 'opus' {prompt}");
  expect(agentTemplate("omp", "", "scan", { ...none, analysis: "opus" }, "posix")).toBe("omp --slow 'opus' {prompt}");
  expect(agentTemplate("omp", "", "analysis", all, "posix")).toBe("omp --model 'opus' {prompt}");
});

test("claude gets --agents for instructions that can scan, each sub-agent with its model only when set", () => {
  const template = agentTemplate("claude", "", "scan", { ...none, execution: "haiku" }, "posix");
  const json = (/--agents '(.*)' \{prompt\}$/.exec(template)?.[1] ?? "").replaceAll("'\\''", "'");
  const agents = JSON.parse(json) as Record<string, { model?: string; prompt: string; description: string }>;
  expect(agents["trama-triage"]?.model).toBe("haiku");
  expect(agents["trama-analysis"]).not.toHaveProperty("model");
  expect(agents["trama-analysis"]?.prompt).toContain("trama-scan");
  expect(agentTemplate("claude", "", "analysis", all, "posix")).toBe("claude --model 'opus' {prompt}");
});

test("custom replaces every {model} with the quoted run's model, or nothing", () => {
  expect(agentCommandLine(agentTemplate("custom", "my --m {model} {prompt} {model}", "scan", all, "posix"), "go", "posix")).toBe(`my --m 'it'\\''s' 'go' 'it'\\''s'`);
  expect(agentTemplate("custom", "my --m {model} {prompt}", "scan", none, "posix")).toBe("my --m  {prompt}");
});

test("the sub-agents sentence: always for omp and claude, for the others only with a sub-agent role set", () => {
  expect(subAgentSentence("omp", none)).toStartWith("Triage each Machine with the trama-triage sub-agent");
  expect(subAgentSentence("claude", none)).toStartWith("Triage each Machine");
  expect(subAgentSentence("codex", none)).toBeUndefined();
  expect(subAgentSentence("custom", { ...none, scan: "x" })).toBeUndefined();
  expect(subAgentSentence("cursor", { ...none, analysis: "x" })).toStartWith("Your agent cannot give sub-agents their own model");
});
