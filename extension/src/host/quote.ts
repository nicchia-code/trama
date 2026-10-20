/** How a terminal's shell wants a literal string quoted. `powershell` is PowerShell 7, `powershell5` Windows PowerShell 5.1. */
export type ShellFamily = "posix" | "fish" | "powershell" | "powershell5";

/**
 * Family of the shell at `shellPath` (`vscode.env.shell`). On Windows the supported shells are Windows PowerShell 5.1,
 * PowerShell 7 and Git Bash (the `bash.exe` of Git for Windows); any other shell there runs as Windows PowerShell 5.1.
 * Elsewhere an unknown shell is treated as POSIX.
 */
export function shellFamily(shellPath: string, windows = process.platform === "win32"): ShellFamily {
  const name = programName(shellPath).toLowerCase().replace(/\.exe$/, "");
  if (name === "pwsh") return "powershell";
  if (!windows) return name === "powershell" ? "powershell" : name === "fish" ? "fish" : "posix";
  // ponytail: Git Bash is recognised by a `Git` folder in its path; a Git installed elsewhere falls back to Windows PowerShell 5.1, add the registry lookup if that bites.
  if (name === "bash" && /[\\/]git[\\/]/i.test(shellPath)) return "posix";
  return "powershell5";
}

/** The program name of a shell path, as written (`cmd.exe`). */
export function programName(shellPath: string): string {
  return shellPath.split(/[\\/]/).pop() ?? "";
}

/**
 * Whether `shellPath` (`vscode.env.shell`) is a shell agent terminals run in. On Windows these are Windows PowerShell 5.1,
 * PowerShell 7 and Git Bash; any other shell there is replaced by Windows PowerShell 5.1. Elsewhere every shell is supported.
 */
export function isSupportedShell(shellPath: string, windows = process.platform === "win32"): boolean {
  if (!windows) return true;
  const name = programName(shellPath).toLowerCase().replace(/\.exe$/, "");
  return name === "powershell" || name === "pwsh" || shellFamily(shellPath, true) === "posix";
}

/**
 * Quotes `text` as one literal argument. Newlines are kept where the shell can continue a quoted string
 * across lines.
 */
export function quote(family: ShellFamily, text: string): string {
  switch (family) {
    case "posix":
      return `'${text.replace(/'/g, `'\\''`)}'`;
    case "fish":
      return `'${text.replace(/[\\']/g, "\\$&")}'`;
    case "powershell":
      return psLiteral(text);
    case "powershell5":
      return psLiteral(nativeArgument(text));
  }
}

/**
 * The program of a Claude Code hook command as the hook runs it. On Windows Claude Code runs hooks with Git Bash whatever
 * the terminal's shell, so the path is quoted for Git Bash with forward slashes; elsewhere it is quoted for the terminal's shell.
 */
export function hookProgram(path: string, family: ShellFamily, windows = process.platform === "win32"): string {
  return windows ? quote("posix", path.replaceAll("\\", "/")) : quote(family, path);
}

/** A PowerShell single-quoted string. PowerShell also treats the typographic single quotes as quote characters. */
function psLiteral(text: string): string {
  return `'${text.replace(/['\u2018\u2019\u201a\u201b]/g, "$&$&")}'`;
}

/**
 * The text as Windows PowerShell 5.1 must write it so the program receives it intact. That shell wraps an argument
 * holding whitespace in double quotes only when it holds an even number of `"`; with an odd number it leaves the
 * argument bare and the program splits it at the spaces. Each `"` is written `\"`, and a run of backslashes before a
 * `"` or at the end of the argument is doubled, as the program reads them. An odd argument gets one more `"` at its end:
 * the count turns even, so PowerShell wraps it, and the program reads that extra `"` as the end of the quoted part.
 */
function nativeArgument(text: string): string {
  let out = "";
  let backslashes = 0;
  for (const ch of text) {
    if (ch === "\\") backslashes++;
    else {
      out += ch === '"' ? "\\".repeat(backslashes * 2 + 1) + ch : "\\".repeat(backslashes) + ch;
      backslashes = 0;
    }
  }
  if (!/\s/.test(text)) return out + "\\".repeat(backslashes);
  const quotes = [...text].filter((ch) => ch === '"').length;
  if (quotes % 2 === 0) return out + "\\".repeat(backslashes * 2);
  return `${out}${"\\".repeat(backslashes * 2)}"`;
}

/** Puts the quoted prompt where `{prompt}` is in `template`, or at the end when the template has no placeholder. */
export function agentCommandLine(template: string, prompt: string, family: ShellFamily): string {
  const quoted = quote(family, prompt);
  const command = template.trim();
  return command.includes("{prompt}") ? command.split("{prompt}").join(quoted) : `${command} ${quoted}`;
}
