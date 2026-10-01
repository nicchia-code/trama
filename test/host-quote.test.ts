import { expect, test } from "bun:test";
import { agentCommandLine, quote, shellFamily } from "../extension/src/host/quote";

const NASTY = ["plain", "it's", "''", "a\nb", "$HOME `id` $(id) !! \\ \\n \"q\"", "  leading and trailing  ", "", "'; rm -rf / #", "%PATH% & | < > ^"];

test("POSIX quoting round-trips through a real shell without expansion", () => {
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

test("cmd.exe uses double quotes, doubles inner ones and flattens newlines", () => {
  expect(quote("cmd", 'say "hi"\r\nthen & stop')).toBe('"say ""hi"" then & stop"');
});

test("recognises the shell from its path", () => {
  expect(shellFamily("/bin/bash")).toBe("posix");
  expect(shellFamily("/usr/bin/zsh")).toBe("posix");
  expect(shellFamily("/usr/bin/fish")).toBe("fish");
  expect(shellFamily("C:\\Program Files\\PowerShell\\7\\pwsh.exe")).toBe("powershell");
  expect(shellFamily("C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\powershell.exe")).toBe("powershell");
  expect(shellFamily("C:\\Windows\\System32\\cmd.exe")).toBe("cmd");
  expect(shellFamily("")).toBe("posix");
});

test("{prompt} is replaced literally, every time, even when the prompt looks like a replacement pattern", () => {
  expect(agentCommandLine("claude {prompt}", "a $& b $1", "posix")).toBe("claude 'a $& b $1'");
  expect(agentCommandLine("agent --first {prompt} --again {prompt}", "x", "posix")).toBe("agent --first 'x' --again 'x'");
  expect(agentCommandLine("codex exec {prompt} --json", "x", "cmd")).toBe('codex exec "x" --json');
});

test("the prompt is appended when the command has no {prompt}", () => {
  expect(agentCommandLine("  claude --verbose  ", "hello", "posix")).toBe("claude --verbose 'hello'");
});
