import { expect, test } from "bun:test";
import { agentCommandLine, isSupportedShell, programName, quote, shellFamily } from "../extension/src/host/quote";

const NASTY = ["plain", "it's", "''", "a\nb", "$HOME `id` $(id) !! \\ \\n \"q\"", "  leading and trailing  ", "", "'; rm -rf / #", "%PATH% & | < > ^"];

// Skipped on Windows: it runs a POSIX `sh`, which Windows does not have; the quoting itself is tested below on every platform.
(process.platform === "win32" ? test.skip : test)("POSIX quoting round-trips through a real shell without expansion", () => {
  for (const text of NASTY) {
    const run = Bun.spawnSync(["sh", "-c", `printf %s ${quote("posix", text)}`]);
    expect(run.stdout.toString()).toBe(text);
  }
});

test("POSIX quoting wraps everything in single quotes and only splits on a single quote", () => {
  expect(quote("posix", "$HOME `id` !")).toBe("'$HOME `id` !'");
  expect(quote("posix", "it's")).toBe(`'it'\\''s'`);
});

test("fish escapes backslashes and single quotes", () => {
  expect(quote("fish", "it's a \\n $x")).toBe("'it\\'s a \\\\n $x'");
});

test("PowerShell doubles single quotes, including the typographic ones it also treats as quotes", () => {
  expect(quote("powershell", "it's $x `t")).toBe("'it''s $x `t'");
  expect(quote("powershell", "\u2018x\u2019")).toBe("'\u2018\u2018x\u2019\u2019'");
});

test("Windows PowerShell 5.1 wraps every argument in double quotes, doubles inner quotes and the backslashes before a quote or at the end", () => {
  expect(quote("powershell5", "plain")).toBe(`'"plain"'`);
  expect(quote("powershell5", "it's")).toBe(`'"it''s"'`);
  expect(quote("powershell5", '{"a":"b c"}')).toBe(`'"{""a"":""b c""}"'`);
  expect(quote("powershell5", 'x"y z\\')).toBe(String.raw`'"x""y z\\"'`);
  expect(quote("powershell5", 'a\\"b')).toBe(String.raw`'"a\\""b"'`);
});


test("PowerShell 7 keeps the plain PowerShell quoting, without escaping the double quotes", () => {
  expect(quote("powershell", '{"a": 1}')).toBe(`'{"a": 1}'`);
});

test("recognises the shell from its name outside Windows", () => {
  expect(shellFamily("/bin/bash", false)).toBe("posix");
  expect(shellFamily("/usr/bin/zsh", false)).toBe("posix");
  expect(shellFamily("/usr/bin/fish", false)).toBe("fish");
  expect(shellFamily("/usr/bin/pwsh", false)).toBe("powershell");
  expect(shellFamily("", false)).toBe("posix");
});

test("on Windows only Git Bash is POSIX; PowerShell 7 and Windows PowerShell 5.1 are told apart, any other shell runs as Windows PowerShell 5.1", () => {
  expect(shellFamily("C:\\Program Files\\Git\\bin\\bash.exe", true)).toBe("posix");
  expect(shellFamily("C:/Program Files/Git/usr/bin/bash.exe", true)).toBe("posix");
  expect(shellFamily("C:\\Program Files\\PowerShell\\7\\pwsh.exe", true)).toBe("powershell");
  expect(shellFamily("C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\powershell.exe", true)).toBe("powershell5");
  expect(shellFamily("C:\\Windows\\System32\\bash.exe", true)).toBe("powershell5");
  expect(shellFamily("C:\\Windows\\System32\\cmd.exe", true)).toBe("powershell5");
});

test("{prompt} is replaced literally, every time, even when the prompt looks like a replacement pattern", () => {
  expect(agentCommandLine("omp {prompt}", "a $& b $1", "posix")).toBe("omp 'a $& b $1'");
  expect(agentCommandLine("agent --first {prompt} --again {prompt}", "x", "posix")).toBe("agent --first 'x' --again 'x'");
  expect(agentCommandLine("codex exec {prompt} --json", "x", "powershell5")).toBe(`codex exec '"x"' --json`);
});

test("the prompt is appended when the command has no {prompt}", () => {
  expect(agentCommandLine("  omp --verbose  ", "hello", "posix")).toBe("omp --verbose 'hello'");
});

test("the program name is the last path segment, as written", () => {
  expect(programName("C:\\Windows\\System32\\cmd.exe")).toBe("cmd.exe");
  expect(programName("/usr/bin/fish")).toBe("fish");
});

test("on Windows only Windows PowerShell 5.1, PowerShell 7 and Git Bash are supported shells", () => {
  expect(isSupportedShell("C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\powershell.exe", true)).toBe(true);
  expect(isSupportedShell("C:\\Program Files\\PowerShell\\7\\pwsh.exe", true)).toBe(true);
  expect(isSupportedShell("C:\\Program Files\\Git\\bin\\bash.exe", true)).toBe(true);
  expect(isSupportedShell("C:\\Windows\\System32\\cmd.exe", true)).toBe(false);
  expect(isSupportedShell("C:\\Windows\\System32\\wsl.exe", true)).toBe(false);
  expect(isSupportedShell("C:\\Windows\\System32\\bash.exe", true)).toBe(false);
});

test("outside Windows every shell is supported", () => {
  expect(isSupportedShell("/usr/bin/zsh", false)).toBe(true);
  expect(isSupportedShell("/bin/cmd", false)).toBe(true);
});

