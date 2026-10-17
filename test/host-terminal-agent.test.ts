import { expect, test } from "bun:test";
import { agentCommandLine } from "../extension/src/host/quote";
import { agentTemplate, roleOf } from "../extension/src/host/terminal-agent";

const none = { model: "", scan: "" };
const all = { model: "opus", scan: "it's" };

test("each instruction's terminal name gives its model role", () => {
  expect(["Design", "Setup", "Import", "Drifts", "Scan", "T3", "All tasks", "abc12345"].map(roleOf)).toEqual(["analysis", "analysis", "analysis", "analysis", "scan", "execution", "execution", "execution"]);
});

test("omp and Claude Code use the scan role for Machine comparison", () => {
  const line = (agent: Parameters<typeof agentTemplate>[0], scanning: boolean, models = all) =>
    agentCommandLine(agentTemplate(agent, scanning, models, "posix"), "go", "posix");
  expect(line("omp", true, { model: "it's", scan: "it's" })).toBe(`omp --model 'it'\\''s' --slow 'it'\\''s' 'go'`);
  expect(line("omp", false, none)).toBe("omp 'go'");
  expect(line("claude", false, { model: "opus", scan: "" })).toBe("claude --model 'opus' 'go'");
});

test("omp idle hooks and Claude session hooks are attached to their own commands", () => {
  expect(agentTemplate("omp", false, none, "posix", "/ext/omp-hook.js")).toBe("omp --hook '/ext/omp-hook.js' {prompt}");
  expect(agentTemplate("claude", false, none, "posix")).toBe("claude {prompt}");

  const settings = JSON.stringify({
    hooks: {
      Stop: [{ hooks: [{ type: "command", command: "'/ext/bin/trama' agent-event idle", timeout: 3 }] }],
      SessionEnd: [{ hooks: [{ type: "command", command: "'/ext/bin/trama' agent-event idle", timeout: 3 }] }],
    },
  });
  expect(agentTemplate("claude", false, none, "posix", undefined, "/ext/bin/trama")).toBe(
    `claude --settings '${settings.replaceAll("'", "'\\''")}' {prompt}`,
  );
});

test("Claude Code gives its Machine comparison sub-agent the scan model only when set", () => {
  const models = { model: "opus", scan: "haiku" };
  const template = agentTemplate("claude", true, models, "posix");
  expect(template).toStartWith("claude --model 'opus' --agents '");
  expect(template).toContain('"trama-analysis"');
  expect(template).toContain('"model":"haiku"');
  expect(template).not.toContain('"model":"opus"');
  expect(template).toEndWith("{prompt}");
  expect(agentTemplate("claude", true, { model: "opus", scan: "" }, "posix")).not.toContain('"model"');
  expect(agentTemplate("claude", false, { model: "opus", scan: "haiku" }, "posix")).not.toContain("--agents");
});

test("settings expose only chat, omp and Claude Code with a panel-default terminal location", async () => {
  const { contributes } = await Bun.file(new URL("../extension/package.json", import.meta.url)).json();
  const properties = contributes.configuration.properties;
  expect(properties["trama.agent"].enum).toEqual(["chat", "omp", "claude"]);
  expect(properties["trama.agent"].default).toBe("chat");
  expect(properties["trama.agent"].scope).toBe("application");
  expect(properties["trama.driftAutoPilot"]).toMatchObject({ type: "string", enum: ["disabled", "enabled", "yolo"], default: "disabled", scope: "application" });
  expect(properties["trama.autoFixDrifts"]).toBeUndefined();
  expect(properties["trama.autoFixCriticalDrifts"]).toBeUndefined();
  expect(properties["trama.terminalLocation"].enum).toEqual(["editor", "panel"]);
  expect(properties["trama.terminalLocation"].scope).toBe("application");
  for (const key of ["agentLauncher", "terminalAgent", "agentCommand", "externalTerminalCommand", "autoImplement", "autoScan"])
    expect(properties[`trama.${key}`]).toBeUndefined();
});
