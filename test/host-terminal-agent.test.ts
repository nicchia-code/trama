import { expect, test } from "bun:test";
import { agentCommandLine } from "../extension/src/host/quote";
import { agentTemplate, roleOf } from "../extension/src/host/terminal-agent";

const none = { analysis: "", scan: "", execution: "" };
const all = { analysis: "opus", scan: "it's", execution: "haiku" };

test("each instruction's terminal name gives its model role", () => {
  expect(["Design", "Setup", "Import", "Drifts", "Scan", "T3", "P2", "All tasks", "abc12345"].map(roleOf)).toEqual(["analysis", "analysis", "analysis", "analysis", "scan", "execution", "execution", "execution", "execution"]);
});

test("omp and Claude Code use the scan role for Machine comparison", () => {
  const line = (agent: Parameters<typeof agentTemplate>[0], role: Parameters<typeof agentTemplate>[1], models = all) =>
    agentCommandLine(agentTemplate(agent, role, models, "posix"), "go", "posix");
  expect(line("omp", "scan")).toBe(`omp --model 'it'\\''s' --slow 'it'\\''s' 'go'`);
  expect(line("omp", "analysis", none)).toBe("omp 'go'");
  expect(line("claude", "analysis")).toBe("claude --model 'opus' 'go'");
});

test("omp idle hooks and Claude session hooks are attached to their own commands", () => {
  expect(agentTemplate("omp", "analysis", none, "posix", "/ext/omp-hook.js")).toBe("omp --hook '/ext/omp-hook.js' {prompt}");
  expect(agentTemplate("claude", "analysis", none, "posix")).toBe("claude {prompt}");

  const settings = JSON.stringify({
    hooks: {
      Stop: [{ hooks: [{ type: "command", command: "'/ext/bin/trama' agent-event idle", timeout: 3 }] }],
      SessionEnd: [{ hooks: [{ type: "command", command: "'/ext/bin/trama' agent-event idle", timeout: 3 }] }],
    },
  });
  expect(agentTemplate("claude", "analysis", none, "posix", undefined, "/ext/bin/trama")).toBe(
    `claude --settings '${settings.replaceAll("'", "'\\''")}' {prompt}`,
  );
});

test("Claude Code gives its Machine comparison sub-agent the scan model only when set", () => {
  const models = { ...none, analysis: "opus", scan: "haiku" };
  const template = agentTemplate("claude", "scan", models, "posix");
  expect(template).toStartWith("claude --model 'haiku' --agents '");
  expect(template).toContain('"trama-analysis"');
  expect(template).toContain('"model":"haiku"');
  expect(template).not.toContain('"model":"opus"');
  expect(template).toEndWith("{prompt}");
  expect(agentTemplate("claude", "scan", { ...none, analysis: "opus" }, "posix")).not.toContain('"model"');
  expect(agentTemplate("claude", "analysis", { ...none, analysis: "opus" }, "posix")).not.toContain("--agents");
});

test("settings expose only chat, omp and Claude Code with a panel-default terminal location", async () => {
  const { contributes } = await Bun.file(new URL("../extension/package.json", import.meta.url)).json();
  const properties = contributes.configuration.properties;
  expect(properties["trama.agent"].enum).toEqual(["chat", "omp", "claude"]);
  expect(properties["trama.agent"].default).toBe("chat");
  expect(properties["trama.agent"].scope).toBe("application");
  expect(properties["trama.autoFixDrifts"]).toMatchObject({ type: "boolean", default: false, scope: "application" });
  expect(properties["trama.autoFixCriticalDrifts"]).toMatchObject({ type: "boolean", default: false, scope: "application" });
  expect(properties["trama.driftAutoPilot"]).toBeUndefined();
  expect(properties["trama.analysis"].markdownDescription).toContain("Resolve Drifts and import");
  expect(properties["trama.analysis"].markdownDescription).not.toContain("analysis of Machines");
  expect(properties["trama.scan"].markdownDescription).toContain("sub-agents that compare Machines");
  expect(properties["trama.terminalLocation"].enum).toEqual(["editor", "panel"]);
  expect(properties["trama.terminalLocation"].scope).toBe("application");
  for (const key of ["agentLauncher", "terminalAgent", "agentCommand", "externalTerminalCommand", "autoImplement", "autoScan"])
    expect(properties[`trama.${key}`]).toBeUndefined();
});
