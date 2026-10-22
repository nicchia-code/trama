import { expect, test } from "bun:test";
import { agentCommandLine } from "../extension/src/host/quote";
import { agentTemplate, launchOverlay, roleOf } from "../extension/src/host/terminal-agent";

const none = { model: "", scan: "" };
const all = { model: "opus", scan: "it's" };

test("each instruction's terminal name gives its model role", () => {
  expect(["Design", "Setup", "Import", "Drifts", "Scan", "T3", "All tasks", "abc12345"].map(roleOf)).toEqual(["analysis", "analysis", "analysis", "analysis", "scan", "execution", "execution", "execution"]);
});

test("omp uses the scan role for Machine comparison and takes the run's model", () => {
  const line = (scanning: boolean, models = all) => agentCommandLine(agentTemplate(scanning, models, "posix"), "go", "posix");
  expect(line(true, { model: "it's", scan: "it's" })).toBe(`omp --model 'it'\\''s' --slow 'it'\\''s' 'go'`);
  expect(line(false, none)).toBe("omp 'go'");
  expect(line(false, { model: "opus", scan: "haiku" })).toBe("omp --model 'opus' 'go'");
});

test("omp's idle hook is attached to its command", () => {
  expect(agentTemplate(false, none, "posix", "/ext/omp-hook.js")).toBe("omp --hook '/ext/omp-hook.js' {prompt}");
});

test("an omp Run with the Advisor Scanner on adds --advisor and its overlay, instead of --slow", () => {
  expect(agentTemplate(false, all, "posix", "/ext/omp-hook.js", "/store/launch.yml", true)).toBe("omp --hook '/ext/omp-hook.js' --advisor --config '/store/launch.yml' --model 'opus' {prompt}");
});

test("an overlay with only exclusions adds --config and never --advisor", () => {
  expect(agentTemplate(true, all, "posix", "/ext/omp-hook.js", "/store/launch.yml")).toBe("omp --hook '/ext/omp-hook.js' --config '/store/launch.yml' --model 'opus' --slow 'it'\\''s' {prompt}");
});

test("the overlay has the advisor role only when trama.scan is set, the task advisors on, and the exclusions when there are some", () => {
  expect(launchOverlay({ disabledExtensions: [] })).toBeUndefined();
  expect(launchOverlay({ advisor: { scan: "" }, disabledExtensions: [] })).toBe('task:\n  agentAdvisor:\n    task: "on"\n');
  expect(launchOverlay({ advisor: { scan: "it's \"x\"" }, disabledExtensions: [] })).toBe('modelRoles:\n  advisor: "it\'s \\"x\\""\ntask:\n  agentAdvisor:\n    task: "on"\n');
  expect(launchOverlay({ disabledExtensions: ["rule:a", "context-file:project:AGENTS.md"] })).toBe('disabledExtensions:\n  - "rule:a"\n  - "context-file:project:AGENTS.md"\n');
  expect(launchOverlay({ advisor: { scan: "" }, disabledExtensions: ["rule:a"] })).toBe('task:\n  agentAdvisor:\n    task: "on"\ndisabledExtensions:\n  - "rule:a"\n');
});

test("an exclusion that looks like YAML structure stays one string", () => {
  expect(launchOverlay({ disabledExtensions: ["a\nb: c", "- x"] })).toBe('disabledExtensions:\n  - "a\\nb: c"\n  - "- x"\n');
});

test("settings expose only Cursor's chat and omp with a panel-default terminal location", async () => {
  const { contributes } = await Bun.file(new URL("../extension/package.json", import.meta.url)).json();
  const properties = contributes.configuration.properties;
  expect(properties["trama.agent"].enum).toEqual(["cursor", "omp"]);
  expect(properties["trama.agent"].default).toBe("cursor");
  for (const key of ["analysis", "scan", "execution", "skillsDir"]) expect(properties[`trama.${key}`].markdownDescription).not.toMatch(/claude|copilot/i);
  expect(properties["trama.agent"].scope).toBe("application");
  expect(properties["trama.driftAutoPilot"]).toBeUndefined();
  expect(properties["trama.autoFixDrifts"]).toBeUndefined();
  expect(properties["trama.autoFixCriticalDrifts"]).toBeUndefined();
  expect(properties["trama.terminalLocation"].enum).toEqual(["editor", "panel"]);
  expect(properties["trama.terminalLocation"].scope).toBe("application");
  expect(properties["trama.ignoreInstructionFiles"].type).toBe("boolean");
  expect(properties["trama.ignoreInstructionFiles"].default).toBe(false);
  expect(properties["trama.ignoreInstructionFiles"].scope).toBe("application");
  for (const key of ["agentLauncher", "terminalAgent", "agentCommand", "externalTerminalCommand", "autoImplement", "autoScan"])
    expect(properties[`trama.${key}`]).toBeUndefined();
});
