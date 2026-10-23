import { expect, test } from "bun:test";
import { agentCommandLine } from "../extension/src/host/quote";
import { agentTemplate, launchOverlay, ompArguments, quickCommandLine, roleOf } from "../extension/src/host/terminal-agent";

const none = { model: "", scan: "" };
const all = { model: "opus", scan: "it's" };

test("each instruction's terminal name gives its model role", () => {
  expect(["Design", "Setup", "Import", "Drifts", "Scan", "T3", "All tasks", "abc12345"].map(roleOf)).toEqual(["analysis", "analysis", "analysis", "analysis", "scan", "execution", "execution", "execution"]);
});

test("omp uses the scan role for Machine comparison and takes the run's model", () => {
  const line = (scanning: boolean, models = all) => agentCommandLine(agentTemplate("omp", scanning, models, "posix"), "go", "posix");
  expect(line(true, { model: "it's", scan: "it's" })).toBe(`'omp' --model 'it'\\''s' --slow 'it'\\''s' 'go'`);
  expect(line(false, none)).toBe("'omp' 'go'");
  expect(line(false, { model: "opus", scan: "haiku" })).toBe("'omp' --model 'opus' 'go'");
});

test("the command starts with the omp program Trama runs, quoted for the shell like the other arguments", () => {
  expect(agentTemplate("/opt/my omp/it's/omp", false, none, "posix")).toBe("'/opt/my omp/it'\\''s/omp' {prompt}");
  expect(agentTemplate("/opt/my omp/it's/omp", false, none, "fish")).toBe("'/opt/my omp/it\\'s/omp' {prompt}");
  expect(agentTemplate("C:\\Program Files\\omp.exe", false, none, "powershell")).toBe("& 'C:\\Program Files\\omp.exe' {prompt}");
  expect(agentTemplate("C:\\Program Files\\omp.exe", false, none, "powershell5")).toBe("& 'C:\\Program Files\\omp.exe' {prompt}");
  expect(agentTemplate("it's", false, none, "powershell")).toBe("& 'it''s' {prompt}");
  expect(quickCommandLine("/opt/my omp/omp", "", "posix")).toBe("'/opt/my omp/omp'");
  expect(quickCommandLine("/opt/my omp/omp", "fast", "posix")).toBe("'/opt/my omp/omp' --model 'fast'");
  expect(quickCommandLine("omp", "fast", "powershell5")).toBe(`& 'omp' --model '"fast"'`);
});

test("omp's idle hook is attached to its command", () => {
  expect(agentTemplate("omp", false, none, "posix", "/ext/omp-hook.js")).toBe("'omp' --hook '/ext/omp-hook.js' {prompt}");
});

test("an omp Run with the Advisor Scanner on adds --advisor and its overlay, instead of --slow", () => {
  expect(agentTemplate("omp", false, all, "posix", "/ext/omp-hook.js", "/store/launch.yml", true)).toBe("'omp' --hook '/ext/omp-hook.js' --advisor --config '/store/launch.yml' --model 'opus' {prompt}");
});

test("an attached instructions file goes as a quoted @file argument right before the prompt", () => {
  expect(agentTemplate("omp", false, all, "posix", "/ext/omp-hook.js", undefined, false, "/ext/media/unify-drifts.md")).toBe("'omp' --hook '/ext/omp-hook.js' --model 'opus' '@/ext/media/unify-drifts.md' {prompt}");
});

test("an overlay with only exclusions adds --config and never --advisor", () => {
  expect(agentTemplate("omp", true, all, "posix", "/ext/omp-hook.js", "/store/launch.yml")).toBe("'omp' --hook '/ext/omp-hook.js' --config '/store/launch.yml' --model 'opus' --slow 'it'\\''s' {prompt}");
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

test("the manifest has no agent choice: trama.agent is gone, and omp's program, terminal location and instruction files are user settings", async () => {
  const { contributes } = await Bun.file(new URL("../extension/package.json", import.meta.url)).json();
  const properties = contributes.configuration.properties;
  expect(properties["trama.agent"]).toBeUndefined();
  expect(JSON.stringify(properties)).not.toMatch(/Cursor's chat|trama\.agent/);
  expect(properties["trama.ompPath"].scope).toBe("application");
  expect(properties["trama.ompPath"].default).toBe("");
  expect(properties["trama.ompPath"].markdownDescription).toBe("Path of the `omp` program Trama runs for every agent, the model list and the checks. Empty looks for `omp` in the editor's PATH, then in `~/.bun/bin` and `~/.local/bin`.");
  for (const key of ["analysis", "scan", "execution", "skillsDir"]) expect(properties[`trama.${key}`].markdownDescription).not.toMatch(/claude|copilot/i);
  expect(properties["trama.driftAutoPilot"]).toBeUndefined();
  expect(properties["trama.autoFixDrifts"]).toBeUndefined();
  expect(properties["trama.autoFixCriticalDrifts"]).toBeUndefined();
  expect(properties["trama.terminalLocation"].enum).toEqual(["editor", "panel"]);
  expect(properties["trama.terminalLocation"].scope).toBe("application");
  expect(properties["trama.ignoreInstructionFiles"].type).toBe("boolean");
  expect(properties["trama.ignoreInstructionFiles"].default).toBe(false);
  expect(properties["trama.ignoreInstructionFiles"].scope).toBe("application");
  expect(properties["trama.ignoreInstructionFiles"].markdownDescription).not.toMatch(/^With omp:/);
  for (const key of ["agentLauncher", "terminalAgent", "agentCommand", "externalTerminalCommand", "autoImplement", "autoScan"])
    expect(properties[`trama.${key}`]).toBeUndefined();
});

test("a conversation's process takes the job's options, then acp, and --yolo only with the yolo approval", () => {
  const options = [["--hook", "/ext/omp-hook.js"], ["--model", "opus"]];
  expect(ompArguments(options, "ask")).toEqual(["--hook", "/ext/omp-hook.js", "--model", "opus", "acp"]);
  expect(ompArguments(options, "yolo")).toEqual(["--hook", "/ext/omp-hook.js", "--model", "opus", "acp", "--yolo"]);
  expect(ompArguments([], "ask")).toEqual(["acp"]);
});
