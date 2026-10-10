import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { detectTerminal, type DetectedTerminal, findProgram, openWindow, reusableKind, startDetached, terminalCommand, type WindowRequest } from "../extension/src/host/external-open";
import { ExternalRuns, type ExternalEnd, externalScript, typedCommand } from "../extension/src/host/external-terminal";

let dir: string;
let bin: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-open-"));
  bin = join(dir, "bin");
  mkdirSync(bin);
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

/** An executable `name` in `folder` that runs `body` as a shell script. */
function program(folder: string, name: string, body = "exit 0"): string {
  mkdirSync(folder, { recursive: true });
  const path = join(folder, name);
  writeFileSync(path, `#!/bin/sh\n${body}\n`);
  chmodSync(path, 0o755);
  return path;
}

describe("which system terminal is used", () => {
  const find = (env: Record<string, string | undefined>, platform = "linux") => detectTerminal(platform, env);

  test("TERMINAL first when it points to an executable, then xdg-terminal-exec, x-terminal-emulator and the list in its order", () => {
    const chosen = program(join(dir, "own"), "my-term");
    program(bin, "xterm");
    program(bin, "kitty");
    expect(find({ TERMINAL: chosen, PATH: bin })).toEqual({ program: chosen, kind: "other" });
    // A TERMINAL that is not an executable is passed over, as is an empty one.
    expect(find({ TERMINAL: join(dir, "missing"), PATH: bin })?.kind).toBe("kitty");
    expect(find({ TERMINAL: "", PATH: bin })?.kind).toBe("kitty");

    const x = program(bin, "x-terminal-emulator");
    expect(find({ PATH: bin })).toEqual({ program: x, kind: "other" });
    const xdg = program(bin, "xdg-terminal-exec");
    expect(find({ PATH: bin })).toEqual({ program: xdg, kind: "xdg-terminal-exec" });
  });

  test("the list is tried in order: gnome-terminal, konsole, xfce4-terminal, kitty, wezterm, alacritty, foot, xterm", () => {
    const order = ["gnome-terminal", "konsole", "xfce4-terminal", "kitty", "wezterm", "alacritty", "foot", "xterm"] as const;
    for (const name of order) program(bin, name);
    for (const [i, name] of order.entries()) {
      expect(find({ PATH: bin })).toEqual({ program: join(bin, name), kind: name });
      rmSync(join(bin, order[i] as string));
    }
    expect(find({ PATH: bin })).toBeUndefined();
  });

  test("a TERMINAL that names a known terminal is recognised by its program name, a name is looked up on the PATH, and a file that is not executable is not a terminal", () => {
    const alacritty = program(join(dir, "elsewhere"), "alacritty");
    expect(find({ TERMINAL: alacritty })).toEqual({ program: alacritty, kind: "alacritty" });
    const kitty = program(bin, "kitty");
    expect(find({ TERMINAL: "kitty", PATH: bin })).toEqual({ program: kitty, kind: "kitty" });
    const plain = join(bin, "not-executable");
    writeFileSync(plain, "");
    expect(findProgram(plain, undefined)).toBeUndefined();
    expect(findProgram("not-executable", bin)).toBeUndefined();
  });

  test("macOS has Terminal.app, any other platform has none", () => {
    expect(find({}, "darwin")).toEqual({ program: "osascript", kind: "terminal-app" });
    expect(find({ PATH: bin }, "win32")).toBeUndefined();
  });

  test("only Terminal.app, kitty and WezTerm can be reused", () => {
    const kind = (name: DetectedTerminal["kind"]) => reusableKind({ program: "p", kind: name });
    expect([kind("terminal-app"), kind("kitty"), kind("wezterm")]).toEqual(["terminal-app", "kitty", "wezterm"]);
    for (const other of ["gnome-terminal", "konsole", "xfce4-terminal", "alacritty", "foot", "xterm", "xdg-terminal-exec", "other"] as const) expect(kind(other)).toBeUndefined();
    expect(reusableKind(undefined)).toBeUndefined();
  });
});

describe("how each terminal is told to run a command in a folder", () => {
  const request: WindowRequest = { script: "echo 'hi'; exit", cwd: "/work/shop", title: "Trama agent", kittySocket: "/run/trama/abc123.sock" };
  const command = (kind: DetectedTerminal["kind"]) => terminalCommand({ program: `/usr/bin/${kind}`, kind }, request);

  test("the script is one argument of `sh -c`, and the folder and the title are given where the terminal takes them", () => {
    const run = ["sh", "-c", request.script];
    expect(command("gnome-terminal").args).toEqual(["--title=Trama agent", "--working-directory=/work/shop", "--", ...run]);
    expect(command("konsole").args).toEqual(["--workdir", "/work/shop", "-p", "tabtitle=Trama agent", "-e", ...run]);
    expect(command("xfce4-terminal").args).toEqual(["--title=Trama agent", "--working-directory=/work/shop", "-x", ...run]);
    expect(command("alacritty").args).toEqual(["--title", "Trama agent", "--working-directory", "/work/shop", "-e", ...run]);
    expect(command("foot").args).toEqual(["--title=Trama agent", "--working-directory=/work/shop", ...run]);
    expect(command("xterm").args).toEqual(["-T", "Trama agent", "-e", ...run]);
    expect(command("wezterm").args).toEqual([
      "start", "--cwd", "/work/shop", "--", "sh", "-c",
      `'/usr/bin/wezterm' cli set-tab-title 'Trama agent' 2>/dev/null; '/usr/bin/wezterm' cli set-window-title 'Trama agent' 2>/dev/null; ${request.script}`,
    ]);
    expect(command("xdg-terminal-exec").args).toEqual(run);
  });

  test("kitty is started with remote control limited to its own socket, and an unknown program gets -e", () => {
    expect(command("kitty").args).toEqual([
      "--title", "Trama agent", "--directory", "/work/shop", "-o", "allow_remote_control=socket-only", "--listen-on", "unix:/run/trama/abc123.sock", "sh", "-c", request.script,
    ]);
    expect(command("other").args).toEqual(["-e", "sh", "-c", request.script]);
    expect(command("other").program).toBe("/usr/bin/other");
  });
});

describe("starting a terminal without blocking the editor", () => {
  test("a terminal that stays running, or that hands over to another process and ends well, has started", async () => {
    await startDetached("sh", ["-c", "sleep 2"], dir, 20);
    await startDetached("sh", ["-c", "exit 0"], dir, 2000);
  });

  test("a program that does not exist fails with the system's error, one that ends at once with an error is 'could not be started'", async () => {
    await expect(startDetached(join(dir, "missing"), [], dir, 20)).rejects.toThrow("ENOENT");
    await expect(startDetached("sh", ["-c", "exit 3"], dir, 2000)).rejects.toThrow("the terminal could not be started");
  });

  test("the terminal starts in the folder it is given", async () => {
    const here = join(dir, "pwd");
    await startDetached("sh", ["-c", `pwd > ${here}`], bin, 2000);
    expect(readFileSync(here, "utf8").trim()).toBe(realpathSync(bin));
  });
});

describe("opening a window that runs the agent line", () => {
  /** A terminal like alacritty: after -e a program and its arguments, which it runs. */
  const faketerm = () => program(bin, "faketerm", `[ "$1" = -e ] || exit 9\nshift\nexec "$@"`);

  /** Waits for the marker of `terminal`'s first run: the script really ran in the window the terminal opened. */
  function followRun(terminal: string) {
    const ended = Promise.withResolvers<ExternalEnd<string>>();
    const runs = new ExternalRuns<string>(join(dir, "markers"), (end) => ended.resolve(end));
    runs.start(terminal, 1, "project").commit();
    return { runs, ended: ended.promise, marker: runs.markerPath(terminal, 1) };
  }
  const requestFor = (script: string): WindowRequest => ({ script, cwd: dir, title: "Trama agent", kittySocket: join(dir, "k.sock") });
  const withShell = async <T>(run: () => Promise<T>): Promise<T> => {
    const before = process.env["SHELL"];
    process.env["SHELL"] = "/usr/bin/true";
    try {
      return await run();
    } finally {
      if (before === undefined) delete process.env["SHELL"];
      else process.env["SHELL"] = before;
    }
  };

  test("the developer's own command runs the script through `sh -c`, even for a terminal that wants a program and arguments, and the marker arrives", async () => {
    const terminal = faketerm();
    const { runs, ended, marker } = followRun("own111");
    try {
      const out = join(dir, "seen");
      const script = externalScript({ agentLine: `sh -c 'printf "%s" "$PWD" > ${out}; exit 6'`, terminal: "own111", marker, cwd: dir });
      const window = await withShell(() => openWindow({ custom: `${terminal} -e {command}`, terminal: undefined }, requestFor(script)));
      expect(window).toBeUndefined();
      expect(await ended).toMatchObject({ terminal: "own111", exitCode: 6 });
      expect(readFileSync(out, "utf8")).toBe(realpathSync(dir));
    } finally {
      runs.dispose();
    }
  });

  test("a detected terminal of any other kind gets -e and the marker arrives, and no window is remembered for it", async () => {
    const terminal = faketerm();
    const { runs, ended, marker } = followRun("det222");
    try {
      const script = externalScript({ agentLine: "true", terminal: "det222", marker, cwd: dir });
      const window = await withShell(() => openWindow({ custom: "", terminal: { program: terminal, kind: "other" } }, requestFor(script)));
      expect(window).toBeUndefined();
      expect(await ended).toMatchObject({ terminal: "det222", exitCode: 0 });
    } finally {
      runs.dispose();
    }
  });

  test("with no terminal and no command nothing opens, and a terminal that cannot start says so", async () => {
    await expect(openWindow({ custom: "", terminal: undefined }, requestFor("true"))).rejects.toThrow("no terminal was found; set trama.externalTerminalCommand");
    await expect(openWindow({ custom: "/nonexistent/terminal {command}", terminal: undefined }, requestFor("true"))).rejects.toThrow("the terminal could not be started");
    await expect(openWindow({ custom: "", terminal: { program: join(dir, "missing"), kind: "xterm" } }, requestFor("true"))).rejects.toThrow("ENOENT");
  });

  test("a request deleted while WezTerm prepares its window never reaches the fallback window", async () => {
    const file = join(dir, "request.md");
    const calls = join(dir, "calls");
    writeFileSync(file, "# Request\n");
    const wezterm = program(bin, "wezterm-cancel", `printf '%s\\n' "$1" >> "${calls}"\nrm -f "${file}"\nexit 1`);
    await expect(openWindow(
      { custom: "", terminal: { program: wezterm, kind: "wezterm" } },
      requestFor("echo instruction"),
      () => existsSync(file),
    )).rejects.toThrow("the instruction was cancelled");
    expect(readFileSync(calls, "utf8")).toBe("cli\n");
    expect(existsSync(file)).toBe(false);
  });

  test("kitty is remembered by its socket and its first window", async () => {
    const kitty = program(bin, "kitty-fake", "exit 0");
    expect(await openWindow({ custom: "", terminal: { program: kitty, kind: "kitty" } }, requestFor("true"))).toEqual({ terminal: "kitty", address: `unix:${join(dir, "k.sock")}`, windowId: 1 });
  });

  test("WezTerm names the new tab and window once with the request's title, whether its running instance opens it or a new one is started, and the script runs", async () => {
    const titles = join(dir, "titles");
    const ran = join(dir, "ran");
    const request = { ...requestFor(`echo ok >> ${ran}`), title: "All tasks" };
    // Title commands are logged; `spawn` and `start` run what follows `--`, as WezTerm does in the new pane.
    const fake = (name: string, spawn: string, panes = "[]") =>
      program(bin, name, [
        `if [ "$1 $2" = "cli spawn" ]; then ${spawn}; fi`,
        `if [ "$1 $2" = "cli list" ]; then echo '${panes}'; exit 0; fi`,
        `if [ "$1" = cli ]; then printf '%s|' "$@" >> ${titles}; echo >> ${titles}; exit 0; fi`,
        `while [ "$1" != -- ]; do shift; done; shift; exec "$@"`,
      ].join("\n"));

    // A running instance prints the id of the pane it opened, which is how the window is reached again.
    const running = fake("wezterm-running", `while [ "$1" != -- ]; do shift; done; shift; "$@" > /dev/null; echo 42; exit 0`);
    expect(await openWindow({ custom: "", terminal: { program: running, kind: "wezterm" } }, request)).toEqual({ terminal: "wezterm", paneId: 42 });
    expect(readFileSync(titles, "utf8")).toBe("cli|set-tab-title|All tasks|\ncli|set-window-title|All tasks|\n");
    expect(readFileSync(ran, "utf8")).toBe("ok\n");

    // No instance to ask: `cli spawn` fails, so `start` opens one, which is found in the listing by the tab title its script sets.
    rmSync(titles);
    const idle = fake("wezterm-idle", `echo "no running instance" >&2; exit 1`, '[{"pane_id":3,"tab_title":"other"},{"pane_id":7,"tab_title":"All tasks"}]');
    expect(await openWindow({ custom: "", terminal: { program: idle, kind: "wezterm" } }, request)).toEqual({ terminal: "wezterm", paneId: 7 });
    expect(readFileSync(titles, "utf8")).toBe("cli|set-tab-title|All tasks|\ncli|set-window-title|All tasks|\n");
    expect(readFileSync(ran, "utf8")).toBe("ok\nok\n");
  });

  test("a WezTerm that cannot name its windows still runs the script", async () => {
    const ran = join(dir, "ran");
    const old = program(bin, "wezterm-old", [
      `if [ "$1" = cli ]; then echo "unrecognized subcommand" >&2; exit 2; fi`,
      `while [ "$1" != -- ]; do shift; done; shift; exec "$@"`,
    ].join("\n"));
    expect(await openWindow({ custom: "", terminal: { program: old, kind: "wezterm" } }, requestFor(`echo ok > ${ran}`))).toBeUndefined();
    expect(readFileSync(ran, "utf8")).toBe("ok\n");
  });

  test("Terminal.app is told to type the script through sh, titles the window with the request's title, and its window id is remembered", async () => {
    const log = join(dir, "osascript-args");
    const osascript = program(bin, "osascript", `printf '%s\\n' "$@" > ${log}\necho 512`);
    const window = await openWindow({ custom: "", terminal: { program: osascript, kind: "terminal-app" } }, { ...requestFor("echo 'it'\\''s'"), title: "T3" });
    expect(window).toEqual({ terminal: "terminal-app", windowId: 512 });
    const args = readFileSync(log, "utf8").split("\n");
    expect(args.filter((_, i) => args[i - 1] === "-e").join("\n")).toContain("do script (item 1 of argv)");
    expect(args.filter((_, i) => args[i - 1] === "-e").join("\n")).toContain("set custom title of selected tab of front window to (item 2 of argv)");
    expect(args.at(-3)).toBe(typedCommand("echo 'it'\\''s'"));
    expect(args.at(-2)).toBe("T3");
  });
});
