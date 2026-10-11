import { expect, test } from "bun:test";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { agentCommandLine, quote, type ShellFamily } from "../extension/src/host/quote";

// Runs the agent command line in each shell of the platform and checks the arguments the program received. On Windows
// the shells are Windows PowerShell 5.1, PowerShell 7 and Git Bash (the shells the terminal supports); elsewhere `sh`.
// Each run is a script file with one agent command per line: the shell parses every line as it would a typed line.

const windows = process.platform === "win32";
const echo = join(import.meta.dir, "shell-argv-echo.ts");

// Empty is left out: Windows PowerShell 5.1 drops an empty argument passed to a program, and a prompt is never empty.
const PROMPTS = [
  String.raw`{"name": "Task T3", "body": "C:\dir\", "q": "\"x\""}`,
  "it's $HOME `id` $(id) %PATH% & | < > ^ !!",
  "perché €uro 🙂 日本",
  "  leading and trailing  ",
  "a\\",
  "x\\\"y z\\",
  "two\\\\ back \"quoted\" end\\\\",
  "line one\nline two",
];

type Shell = { name: string; family: ShellFamily; exe: () => string; args: (file: string) => string[] };

const powershellArgs = ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File"];

function pwsh7(): string {
  const found = Bun.which("pwsh");
  if (!found) throw new Error("PowerShell 7 (pwsh.exe) is not on PATH");
  return found;
}

// `bash.exe` on PATH may be WSL's, so Git for Windows is looked up in its usual folders.
function gitBash(): string {
  const roots = [process.env.ProgramW6432, process.env.ProgramFiles, process.env["ProgramFiles(x86)"], process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, "Programs")];
  for (const root of roots) {
    const candidate = root && join(root, "Git", "bin", "bash.exe");
    if (candidate && existsSync(candidate)) return candidate;
  }
  throw new Error("Git for Windows (Git Bash, bash.exe) is not installed in a standard folder");
}

const SHELLS: Shell[] = windows
  ? [
      { name: "Windows PowerShell 5.1", family: "powershell5", exe: () => join(process.env.SystemRoot ?? "C:\\Windows", "System32", "WindowsPowerShell", "v1.0", "powershell.exe"), args: (file) => [...powershellArgs, file] },
      { name: "PowerShell 7", family: "powershell", exe: pwsh7, args: (file) => [...powershellArgs, file] },
      { name: "Git Bash", family: "posix", exe: gitBash, args: (file) => [file] },
    ]
  : [{ name: "sh", family: "posix", exe: () => "sh", args: (file) => [file] }];

/** The agent command template: `bun` runs the echo script with the prompt as its argument. PowerShell calls with `&`. */
function template(family: ShellFamily): string {
  const invoke = family.startsWith("powershell") ? "& " : "";
  // Git Bash reads Windows paths only with forward slashes.
  const slashes = windows && family === "posix";
  const program = quote(family, slashes ? process.execPath.replaceAll("\\", "/") : process.execPath);
  const script = quote(family, slashes ? echo.replaceAll("\\", "/") : echo);
  return `${invoke}${program} ${script} {prompt}`;
}

function runLines(shell: Shell, lines: string[]): { exitCode: number | null; stderr: string; args: unknown[] } {
  const dir = mkdtempSync(join(tmpdir(), "trama-quote-"));
  try {
    const powershell = shell.family.startsWith("powershell");
    // PowerShell 5.1 reads a script as ANSI unless it starts with a UTF-8 byte order mark.
    const file = join(dir, powershell ? "line.ps1" : "line.sh");
    writeFileSync(file, `${powershell ? "\uFEFF" : ""}${lines.join("\n")}\n`);
    const run = Bun.spawnSync([shell.exe(), ...shell.args(file)], { cwd: dir, timeout: 120_000 });
    const args = run.stdout.toString().split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
    return { exitCode: run.exitCode, stderr: run.stderr.toString(), args };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

for (const shell of SHELLS) {
  test(`${shell.name} hands each agent command argument to the program intact`, () => {
    const lines = PROMPTS.map((prompt) => agentCommandLine(template(shell.family), prompt, shell.family));
    expect(runLines(shell, lines)).toEqual({ exitCode: 0, stderr: "", args: PROMPTS.map((prompt) => [prompt]) });
  }, 180_000);
}
