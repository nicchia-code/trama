/** How a terminal's shell wants a literal string quoted. */
export type ShellFamily = "posix" | "fish" | "powershell" | "cmd";

/** Family of the shell at `shellPath` (`vscode.env.shell`); unknown shells are treated as POSIX. */
export function shellFamily(shellPath: string): ShellFamily {
  const name = (shellPath.split(/[\\/]/).pop() ?? "").toLowerCase().replace(/\.exe$/, "");
  if (name === "pwsh" || name === "powershell") return "powershell";
  if (name === "cmd") return "cmd";
  if (name === "fish") return "fish";
  return "posix";
}

/**
 * Quotes `text` as one literal argument. Newlines are kept where the shell can continue a quoted string
 * across lines and become spaces in cmd.exe, which cannot. cmd.exe still expands `%VAR%` inside quotes.
 */
export function quote(family: ShellFamily, text: string): string {
  switch (family) {
    case "posix":
      return `'${text.replace(/'/g, `'\\''`)}'`;
    case "fish":
      return `'${text.replace(/[\\']/g, "\\$&")}'`;
    case "powershell":
      // PowerShell also treats the typographic single quotes as quote characters.
      return `'${text.replace(/['\u2018\u2019\u201a\u201b]/g, "$&$&")}'`;
    case "cmd":
      return `"${text.replace(/\r?\n|\r/g, " ").replace(/"/g, '""')}"`;
  }
}

/** Puts the quoted prompt where `{prompt}` is in `template`, or at the end when the template has no placeholder. */
export function agentCommandLine(template: string, prompt: string, family: ShellFamily): string {
  const quoted = quote(family, prompt);
  const command = template.trim();
  return command.includes("{prompt}") ? command.split("{prompt}").join(quoted) : `${command} ${quoted}`;
}
