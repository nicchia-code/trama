// `bun run site:screenshots [scene…] [--theme light|dark] [--skip-build] [--keep-going] [--trace <folder>]`: takes the screenshots of the guide, in both themes, without anything by hand.
//
// It builds the extension and the `trama` binary, downloads a pinned VS Code with `@vscode/test-electron` and, for every scene of `screenshots/scenes.ts` and every theme, launches that VS Code through
// Playwright's Electron support: the extension under development, an empty user profile, a 1440×900 window, the editor's Light Modern or Dark Modern theme with Trama's `Theme` setting to match, and a
// stand-in `omp` (`screenshots/omp-standin.ts`) first on the PATH. The scene's project is a fresh copy of `examples/shop`, prepared once and copied for each theme, so that the two images show the
// same cards with the same identities. The two images of a scene are written to `site/public/screenshots/<scene>.light.png` and `<scene>.dark.png` once both exist; a scene whose step does not
// find what it waits for fails the run, naming the scene.
//
// It is run by hand when the extension's interface changes, and the images are committed: the deploy never runs it.
import { downloadAndUnzipVSCode } from "@vscode/test-electron";
import { chmodSync, copyFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SCENES } from "./screenshots/scenes";
import { runner, copyShop, prepare, type Result } from "./screenshots/project";
import { describe, runStep, type Context } from "./screenshots/steps";
import type { Scene, Theme } from "./screenshots/types";
import { Window } from "./screenshots/window";

/** The version of VS Code the screenshots are taken with: pinned, so the pictures change only when this line does. */
export const VSCODE_VERSION = "1.143.1";

const root = join(import.meta.dir, "..");
/** `--trace <folder>` writes the picture of the window after every step, to see where a scene goes wrong. */
const traceDir = process.argv.includes("--trace") ? process.argv[process.argv.indexOf("--trace") + 1] : undefined;
const images = join(root, "site", "public", "screenshots");
const cache = join(root, "node_modules", ".cache", "trama-screenshots");
const THEMES: readonly Theme[] = ["light", "dark"];

/** A scene that failed: names the scene, the theme and the step. */
class SceneFailure extends Error {
  constructor(scene: string, theme: Theme, step: string, cause: unknown, picture: string | undefined) {
    const reason = (cause instanceof Error ? cause.message : String(cause)).trim().split("\n").slice(0, 8).join("\n    ");
    super(`scene "${scene}" (${theme}) failed at ${step}: ${reason}${picture === undefined ? "" : `\n  what the window showed: ${picture}`}`);
  }
}

async function sh(command: string[], what: string): Promise<void> {
  const child = Bun.spawn(command, { cwd: root, stdout: "inherit", stderr: "inherit" });
  if ((await child.exited) !== 0) throw new Error(`${what} failed`);
}

/** Builds the extension and the `trama` binary where the extension looks for it (`extension/bin`, which git ignores). */
async function build(): Promise<void> {
  console.log("building the extension and the trama binary");
  await sh([process.execPath, "run", "scripts/build-extension.ts"], "building the extension");
  mkdirSync(join(root, "extension", "bin"), { recursive: true });
  const binary = join(root, "extension", "bin", "trama");
  await sh([process.execPath, "build", "--compile", "src/cli/bin.ts", "--outfile", binary], "building the trama binary");
  chmodSync(binary, 0o755);
}

async function vscode(): Promise<string> {
  mkdirSync(cache, { recursive: true });
  return downloadAndUnzipVSCode({ version: VSCODE_VERSION, cachePath: join(cache, "vscode") });
}

/** The folder with the stand-in `omp` first on the PATH: a script that runs `omp-standin.ts` with the Bun that runs this script. */
function standinBin(work: string): string {
  const bin = join(work, "bin");
  mkdirSync(bin);
  const file = join(bin, "omp");
  writeFileSync(file, `#!/bin/sh\nexec "${process.execPath}" "${join(root, "scripts", "screenshots", "omp-standin.ts")}" "$@"\n`);
  chmodSync(file, 0o755);
  // The GitHub CLI of Team's reads.
  const gh = join(bin, "gh");
  writeFileSync(gh, `#!/bin/sh\nexec "${process.execPath}" "${join(root, "scripts", "screenshots", "gh-standin.ts")}" "$@"\n`);
  chmodSync(gh, 0o755);
  return bin;
}

/** The project of a scene, prepared once for all its themes: its folder and what the commands of the preparation printed. */
interface Prepared {
  folder: string;
  results: ReadonlyMap<string, Result>;
}

/** Copies `examples/shop` into `folder` and runs the scene's preparation there. */
async function prepareScene(scene: Scene, folder: string): Promise<Prepared> {
  const run = runner(folder, join(root, "extension", "bin", "trama"));
  if (scene.project !== "none") copyShop(scene.project, folder);
  try {
    await prepare(run, scene.prepare ?? []);
  } catch (error) {
    throw new Error(`scene "${scene.name}" failed preparing the project: ${error instanceof Error ? error.message : String(error)}`);
  }
  return { folder, results: run.results };
}

/** Takes the picture of a scene in a theme into `out`, on a copy of its prepared project. */
async function take(scene: Scene, theme: Theme, prepared: Prepared, executable: string, out: string): Promise<void> {
  // A short path: the editor listens on a socket inside the profile, and a socket path may have about a hundred characters.
  const work = mkdtempSync(join(tmpdir(), "ts-"));
  const project = join(work, "shop");
  const trama = join(root, "extension", "bin", "trama");
  const run = runner(project, trama);
  for (const [name, result] of prepared.results) run.results.set(name, structuredClone(result));
  const standin = join(work, "standin");
  let win: Window | undefined;
  const ctx = { running: [] as (() => void)[], hovering: false, standin, run } as Context;
  let at = "launching VS Code";
  try {
    if (scene.project !== "none") cpSync(prepared.folder, project, { recursive: true });
    win = await Window.launch({
      executable,
      extension: join(root, "extension"),
      project: scene.project === "none" ? undefined : project,
      theme,
      bin: standinBin(work),
      standin,
      profile: join(work, "p"),
      settings: scene.settings ?? {},
    });
    ctx.win = win;
    await win.page.waitForTimeout(1500);
    for (const [index, step] of scene.steps.entries()) {
      at = `step ${index + 1} (${describe(step)})`;
      await runStep(ctx, step);
      if (traceDir !== undefined) {
        mkdirSync(traceDir, { recursive: true });
        await win.page.screenshot({ path: join(traceDir, `${scene.name}.${theme}.${String(index + 1).padStart(2, "0")}.png`) });
      }
    }
    at = "taking the picture";
    await win.capture(out, scene.area, ctx.hovering);
  } catch (error) {
    let picture: string | undefined;
    if (win !== undefined) {
      mkdirSync(join(cache, "failures"), { recursive: true });
      picture = join(cache, "failures", `${scene.name}.${theme}.png`);
      await win.page.screenshot({ path: picture }).catch(() => {
        picture = undefined;
      });
    }
    throw new SceneFailure(scene.name, theme, at, error, picture);
  } finally {
    for (const stop of ctx.running) stop();
    await win?.close();
    rmSync(work, { recursive: true, force: true });
  }
}

const argv = process.argv.slice(2);
const themeFlag = argv.indexOf("--theme");
const themeName = themeFlag >= 0 ? argv[themeFlag + 1] : undefined;
const themes = themeName === undefined ? THEMES : THEMES.filter((theme) => theme === themeName);
if (themes.length === 0) throw new Error("--theme is light or dark");
const traceFlag = argv.indexOf("--trace");
const named = argv.filter((arg, at) => !arg.startsWith("--") && at !== (themeFlag < 0 ? -1 : themeFlag + 1) && at !== (traceFlag < 0 ? -1 : traceFlag + 1));
const unknown = named.filter((name) => !SCENES.some((scene) => scene.name === name));
if (unknown.length > 0) throw new Error(`unknown scene ${unknown.join(", ")}; the scenes are ${SCENES.map((scene) => scene.name).join(", ")}`);
const scenes = named.length === 0 ? SCENES : SCENES.filter((scene) => named.includes(scene.name));

if (process.platform === "win32") throw new Error("the screenshots are taken on macOS or Linux: the stand-in omp is a shell script");
if (!argv.includes("--skip-build")) await build();
else if (!existsSync(join(root, "extension", "bin", "trama"))) throw new Error("--skip-build needs a built extension and extension/bin/trama");
const executable = await vscode();
mkdirSync(images, { recursive: true });
const staging = mkdtempSync(join(tmpdir(), "trama-screenshots-"));
const failures: string[] = [];
try {
  for (const scene of scenes) {
    try {
      const prepared = await prepareScene(scene, join(staging, "projects", scene.name));
      for (const theme of themes) {
        console.log(`${scene.name} (${theme})`);
        await take(scene, theme, prepared, executable, join(staging, `${scene.name}.${theme}.png`));
      }
    } catch (error) {
      // A scene fails the run, naming it; `--keep-going` first tries the other scenes, to see every failure of a change at once.
      if (!argv.includes("--keep-going")) throw error;
      failures.push(error instanceof Error ? error.message : String(error));
      continue;
    }
    for (const theme of themes) copyFileSync(join(staging, `${scene.name}.${theme}.png`), join(images, `${scene.name}.${theme}.png`));
  }
  if (failures.length > 0) throw new Error(`${failures.length} scene(s) failed:\n${failures.join("\n")}`);
  console.log(`wrote ${scenes.length * themes.length} images to site/public/screenshots/`);
} finally {
  rmSync(staging, { recursive: true, force: true });
}
