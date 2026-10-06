import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { customTerminalCommand, ExternalRuns, type ExternalEnd, externalScript, markerName, parseMarkerName } from "../extension/src/host/external-terminal";
import { runScripting, scriptingCommand } from "../extension/src/host/external-reuse";
import { agentCommandLine } from "../extension/src/host/quote";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-external-"));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

/** Runs `script` the way a terminal's `sh -c` would, with the login shell replaced by `true`. */
function runScript(script: string) {
  return spawnSync("sh", ["-c", script], { env: { PATH: process.env.PATH ?? "", SHELL: "/usr/bin/true" }, encoding: "utf8" });
}

describe("the script written into the external window", () => {
  test("runs the agent with the variables, the window's address and the quoted instruction, then leaves only the exit status as a marker", () => {
    const out = join(dir, "seen");
    const marker = join(dir, markerName("abc123", 2));
    const instruction = `Use the trama-design skill. It's "quoted" $HOME \`x\`; rm -rf /`;
    const template = `sh -c 'printf "%s|%s|%s|%s|%s" "$TRAMA_AGENT" "$TRAMA_TERMINAL" "$TRAMA_QUESTION_ENDPOINT" "$PATH" "$0" > ${out}; exit 3' {prompt}`;
    const script = externalScript({ agentLine: agentCommandLine(template, instruction, "posix"), terminal: "abc123", marker, binDir: "/opt/trama bin", endpoint: "/run/user/1/trama q.sock" });

    const result = runScript(script);

    expect(result.status).toBe(0);
    const [agent, terminal, endpoint, path, prompt] = readFileSync(out, "utf8").split("|");
    expect([agent, terminal, endpoint, prompt]).toEqual(["1", "abc123", "/run/user/1/trama q.sock", instruction]);
    expect(path?.startsWith("/opt/trama bin:")).toBe(true);
    expect(readFileSync(marker, "utf8")).toBe("3\n");
    expect(readdirSync(dir).sort()).toEqual(["abc123-2.end", "seen"]);
  });

  test("a successful command leaves 0 and the window goes on to the login shell", () => {
    const marker = join(dir, markerName("abc123", 1));
    const log = join(dir, "shell");
    const shell = join(dir, "login.sh");
    writeFileSync(shell, `#!/bin/sh\nprintf '%s' "$*" > ${log}\n`, { mode: 0o755 });
    const script = externalScript({ agentLine: "true", terminal: "abc123", marker });

    const result = spawnSync("sh", ["-c", script], { env: { PATH: process.env.PATH ?? "", SHELL: shell }, encoding: "utf8" });

    expect(result.status).toBe(0);
    expect(readFileSync(marker, "utf8")).toBe("0\n");
    expect(readFileSync(log, "utf8")).toBe("-l");
  });
});

describe("the marker of an external run", () => {
  test("names are <terminal>-<run>.end and nothing else is a marker", () => {
    expect(parseMarkerName(markerName("abc123", 12))).toEqual({ terminal: "abc123", run: 12 });
    for (const name of ["abc123-12.end.tmp", "abc123.end", "abc123-x.end", "ABC-1.end", "abc123-1.endx"]) expect(parseMarkerName(name)).toBeUndefined();
  });

  /** The ends reported to the editor and a promise that resolves at the next end. */
  function follow() {
    const ends: ExternalEnd<string>[] = [];
    let wake: () => void = () => undefined;
    const runs = new ExternalRuns<string>(
      dir,
      (end) => {
        ends.push(end);
        wake();
      },
    );
    const next = () => new Promise<void>((resolve) => (wake = resolve));
    return { runs, ends, next };
  }

  /** The script's way of writing a marker: a temporary name, then a rename. */
  function leave(terminal: string, run: number, status: string) {
    const final = join(dir, markerName(terminal, run));
    writeFileSync(`${final}.tmp`, status);
    renameSync(`${final}.tmp`, final);
  }

  test("the marker of the run in progress ends it with its exit status, is deleted, and a second one for it counts for nothing", async () => {
    const { runs, ends, next } = follow();
    try {
      runs.start("abc123", runs.nextRun("abc123"), "project").commit();
      const ended = next();
      leave("abc123", 1, "7\n");
      await ended;
      expect(ends).toEqual([{ terminal: "abc123", run: 1, exitCode: 7, context: "project" }]);
      expect(readdirSync(dir)).toEqual([]);

      leave("abc123", 1, "0\n");
      runs.scan();
      expect(ends).toHaveLength(1);
      expect(readdirSync(dir)).toEqual([]);
    } finally {
      runs.dispose();
    }
  });

  test("a marker of an older run, of an unknown terminal, or with a content that is not a status never ends the run in progress", () => {
    const { runs, ends } = follow();
    try {
      runs.start("abc123", 1, "p").commit();
      runs.start("abc123", runs.nextRun("abc123"), "p").commit();
      leave("abc123", 1, "0\n");
      leave("zzz999", 1, "0\n");
      runs.scan();
      expect(ends).toEqual([]);
      expect(readdirSync(dir)).toEqual([]);

      leave("abc123", 2, "boom");
      runs.scan();
      expect(ends).toEqual([{ terminal: "abc123", run: 2, exitCode: undefined, context: "p" }]);
    } finally {
      runs.dispose();
    }
  });

  test("each parallel window reports its own command ending once and stays busy until its marker arrives", () => {
    const { runs, ends } = follow();
    try {
      runs.start("old111", runs.nextRun("old111"), "p").commit();
      runs.start("new222", runs.nextRun("new222"), "p").commit();
      expect(runs.idle("old111")).toBe(false);
      expect(runs.idle("new222")).toBe(false);
      leave("old111", 1, "0\n");
      runs.scan();
      expect(ends).toEqual([{ terminal: "old111", run: 1, exitCode: 0, context: "p" }]);
      expect(runs.idle("old111")).toBe(true);
      expect(runs.idle("new222")).toBe(false);
      expect(readdirSync(dir)).toEqual([]);

      leave("old111", 1, "0\n");
      leave("new222", 1, "3\n");
      runs.scan();
      expect(ends).toEqual([
        { terminal: "old111", run: 1, exitCode: 0, context: "p" },
        { terminal: "new222", run: 1, exitCode: 3, context: "p" },
      ]);
      expect(runs.idle("new222")).toBe(true);
    } finally {
      runs.dispose();
    }
  });


  test("a held end reports only after commit, without suppressing another window's ending", () => {
    const { runs, ends } = follow();
    try {
      const old = runs.start("old111", 1, "p");
      leave("old111", 1, "1\n");
      runs.scan();
      runs.start("new222", 1, "p").commit();
      old.commit();
      expect(ends).toEqual([{ terminal: "old111", run: 1, exitCode: 1, context: "p" }]);
      leave("new222", 1, "0\n");
      runs.scan();
      expect(ends).toEqual([
        { terminal: "old111", run: 1, exitCode: 1, context: "p" },
        { terminal: "new222", run: 1, exitCode: 0, context: "p" },
      ]);
    } finally {
      runs.dispose();
    }
  });

  test("the previous run ends normally during a failed opening and is not counted again on abandonment", () => {
    const { runs, ends } = follow();
    try {
      runs.start("old111", 1, "old").commit();
      const failed = runs.start("new222", 1, "new");
      leave("old111", 1, "0\n");
      runs.scan();
      failed.abandon();
      leave("old111", 1, "0\n");
      runs.scan();
      expect(ends).toEqual([{ terminal: "old111", run: 1, exitCode: 0, context: "old" }]);
      expect(runs.idle("old111")).toBe(true);
    } finally {
      runs.dispose();
    }
  });

  test("abandoning a failed opening drops its attempt, frees its number and leaves the previous run followed", () => {
    const { runs, ends } = follow();
    try {
      runs.start("old111", runs.nextRun("old111"), "old").commit();
      runs.start("new222", runs.nextRun("new222"), "new").abandon();
      expect(runs.nextRun("new222")).toBe(1);
      leave("new222", 1, "0\n");
      leave("old111", 1, "3\n");
      runs.scan();
      expect(ends).toEqual([{ terminal: "old111", run: 1, exitCode: 3, context: "old" }]);
    } finally {
      runs.dispose();
    }
  });

  test("abandoning a run after its end was counted does nothing, and a later run is not touched", () => {
    const { runs, ends } = follow();
    try {
      const first = runs.start("abc123", 1, "p");
      first.commit();
      leave("abc123", 1, "0\n");
      runs.scan();
      runs.start("abc123", 2, "p").commit();
      first.abandon();
      leave("abc123", 2, "0\n");
      runs.scan();
      expect(ends.map((end) => end.run)).toEqual([1, 2]);
    } finally {
      runs.dispose();
    }
  });

  test("an end that comes before the window is known to be open is held until commit, and dropped with the run when the window fails", () => {
    const { runs, ends } = follow();
    try {
      const instant = runs.start("abc123", 1, "p");
      leave("abc123", 1, "127\n");
      runs.scan();
      expect(readdirSync(dir)).toEqual([]);
      expect(ends).toEqual([]);
      instant.commit();
      expect(ends).toEqual([{ terminal: "abc123", run: 1, exitCode: 127, context: "p" }]);
      instant.commit();
      expect(ends).toHaveLength(1);

      const failed = runs.start("def456", 1, "q");
      leave("def456", 1, "0\n");
      runs.scan();
      failed.abandon();
      failed.commit();
      expect(ends).toHaveLength(1);
    } finally {
      runs.dispose();
    }
  });

  test("markers left by an earlier session are deleted at start without effect, and the folder is created", () => {
    const folder = join(dir, "external-terminals", "nested");
    expect(existsSync(folder)).toBe(false);
    const first = new ExternalRuns<string>(folder, () => undefined);
    writeFileSync(join(folder, markerName("abc123", 1)), "0\n");
    first.dispose();
    const ends: ExternalEnd<string>[] = [];
    const second = new ExternalRuns<string>(folder, (end) => ends.push(end));
    try {
      expect(readdirSync(folder)).toEqual([]);
      second.start("abc123", 1, "p").commit();
      second.scan();
      expect(ends).toEqual([]);
    } finally {
      second.dispose();
    }
  });
});

describe("the scripting that writes into a window opened before", () => {
  const line = `export TRAMA_AGENT=1; agent 'It'\\''s "quoted" $HOME\\n'; exec "$SHELL" -l`;

  test("each terminal gets its own scripting command and the line travels as it is", () => {
    expect(scriptingCommand({ terminal: "kitty", address: "unix:/tmp/trama-kitty", windowId: 4 }, line)).toEqual({
      program: "kitten",
      args: ["@", "--to", "unix:/tmp/trama-kitty", "send-text", "--match", "id:4", "--stdin"],
      input: `${line}\r`,
    });
    expect(scriptingCommand({ terminal: "wezterm", paneId: 9 }, line)).toEqual({
      program: "wezterm",
      args: ["cli", "send-text", "--pane-id", "9", "--no-paste"],
      input: `${line}\r`,
    });
    const app = scriptingCommand({ terminal: "terminal-app", windowId: 512 }, line);
    expect(app.program).toBe("osascript");
    // The line and the window are the script's arguments: nothing of them is inside the AppleScript text.
    expect(app.args.slice(-2)).toEqual([line, "512"]);
    const appleScript = app.args.filter((_, i) => app.args[i - 1] === "-e").join("\n");
    expect(appleScript).toContain("do script (item 1 of argv) in (tab 1 of window id");
    expect(appleScript).not.toContain("TRAMA_AGENT");
  });

  test("it succeeds when the command ends without error, and the input reaches it untouched", async () => {
    const seen = join(dir, "seen");
    await runScripting({ program: "sh", args: ["-c", `cat > ${seen}`], input: `${line}\r` });
    expect(readFileSync(seen, "utf8")).toBe(`${line}\r`);
  });

  test("it fails with the message the scripting gave, with the system's error when the program does not start, and when it does not answer", async () => {
    const failing = runScripting({ program: "sh", args: ["-c", "echo 'no such window' >&2; exit 1"] });
    await expect(failing).rejects.toThrow("no such window");
    await expect(runScripting({ program: "sh", args: ["-c", "exit 2"] })).rejects.toThrow("sh ended with status 2");
    await expect(runScripting({ program: join(dir, "missing-terminal"), args: [] })).rejects.toThrow("ENOENT");
    await expect(runScripting({ program: "sh", args: ["-c", "sleep 5"] }, 30)).rejects.toThrow("did not answer");
  });
});

describe("the developer's own terminal command", () => {
  /** A terminal like alacritty: after -e it wants a program and its arguments, and runs them. */
  function fakeTerminal(): string {
    const path = join(dir, "faketerm");
    writeFileSync(path, `#!/bin/sh\n[ "$1" = -e ] || exit 9\nshift\nexec "$@"\n`, { mode: 0o755 });
    return path;
  }

  test("{command} runs the agent line even for a terminal that takes a program and arguments after -e, and the marker arrives", () => {
    const terminal = fakeTerminal();
    const marker = join(dir, markerName("abc123", 1));
    const instruction = `Use the trama-scan skill. It's "quoted" $HOME; rm -rf /`;
    const out = join(dir, "seen");
    const agentLine = agentCommandLine(`sh -c 'printf %s "$0" > ${out}; exit 5' {prompt}`, instruction, "posix");
    const script = externalScript({ agentLine, terminal: "abc123", marker });

    const result = spawnSync("sh", ["-c", customTerminalCommand(`${terminal} -e {command}`, script)], { cwd: dir, env: { PATH: process.env.PATH ?? "", SHELL: "/usr/bin/true" }, encoding: "utf8" });

    expect(result.status).toBe(0);
    expect(readFileSync(out, "utf8")).toBe(instruction);
    expect(readFileSync(marker, "utf8")).toBe("5\n");
  });

  test("without {command} the words go at the end, and {command} used twice is replaced twice", () => {
    expect(customTerminalCommand("xterm -e", "echo 'hi'")).toBe(`xterm -e sh -c 'echo '\\''hi'\\'''`);
    expect(customTerminalCommand("  a {command} b {command}  ", "x")).toBe("a sh -c 'x' b sh -c 'x'");
  });
});
