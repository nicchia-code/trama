// Runs the steps of a scene (`types.ts`) against a launched window. A step that does not find what it needs throws; `scripts/screenshots.ts` names the scene and the step.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { prepare, type Runner, tramaRun, tramaStart } from "./project";
import type { Step, Surface, Target } from "./types";
import { STEP_TIMEOUT_MS, type Window } from "./window";

/** What a step may use of the scene being run. */
export interface Context {
  win: Window;
  run: Runner;
  /** Where the stand-in omp writes what Trama gave each job (`agents/<terminal>.json`). */
  standin: string;
  /** The commands left running (question rounds), stopped when the scene ends. */
  running: (() => void)[];
  /** The pointer was put on an element by the last step: the picture keeps it there. */
  hovering: boolean;
}

interface Job {
  terminal: string;
  startedAt: number;
  env: Record<string, string>;
  /** The instruction of the job; General, a conversation without a job, has none. */
  prompt?: string;
}

/** The jobs the stand-in omp has started and given an instruction, the oldest first. */
function jobs(standin: string): Job[] {
  const folder = join(standin, "agents");
  if (!existsSync(folder)) return [];
  return readdirSync(folder)
    .filter((name) => name.endsWith(".json"))
    .flatMap((name) => {
      try {
        const job = JSON.parse(readFileSync(join(folder, name), "utf8")) as Job;
        return job.prompt === undefined ? [] : [job];
      } catch {
        return []; // Half written: the next look finds it whole.
      }
    })
    .sort((a, b) => a.startedAt - b.startedAt);
}

async function waitFor<T>(what: string, look: () => T | undefined | Promise<T | undefined>, timeoutMs = STEP_TIMEOUT_MS): Promise<T> {
  const end = Date.now() + timeoutMs;
  for (;;) {
    const found = await look();
    if (found !== undefined) return found;
    if (Date.now() > end) throw new Error(`timed out after ${timeoutMs / 1000} s waiting for ${what}`);
    await Bun.sleep(100);
  }
}

const SIDEBAR = { explorer: "workbench.view.explorer", trama: "workbench.view.extension.trama", hidden: "workbench.action.closeSidebar" } as const;

/** What a step is, in words, for the message of a failure. */
export function describe(step: Step): string {
  switch (step.kind) {
    case "click":
    case "hover":
    case "wait":
    case "scroll":
      return `${step.kind} ${describeTarget(step.in, step.target)}`;
    case "type":
      return `type ${JSON.stringify(step.text)} into ${describeTarget(step.in, step.target)}`;
    case "command":
      return `command ${step.id}`;
    case "press":
      return `press ${step.keys}`;
    case "write":
      return `write ${JSON.stringify(step.text.slice(0, 30))}`;
    case "trama":
      return `trama ${step.run.join(" ")}`;
    default:
      return step.kind;
  }
}

function describeTarget(surface: Surface, target: Target): string {
  const own = Object.entries(target)
    .filter(([key]) => key !== "within" && key !== "nth" && key !== "exact")
    .map(([key, value]) => `${key}=${String(value)}`)
    .join(" ");
  return `${own}${target.within === undefined ? "" : ` in (${describeTarget(surface, target.within)})`}${target.nth === undefined ? "" : ` #${target.nth}`} of the ${surface}`;
}

/** Runs one step. */
export async function runStep(ctx: Context, step: Step): Promise<void> {
  const { win } = ctx;
  ctx.hovering = step.kind === "hover";
  switch (step.kind) {
    case "trama":
    case "file":
    case "git":
      await prepare(ctx.run, [step]);
      return;
    case "command":
      await win.command(step.id, step.args);
      return;
    case "click": {
      const element = await win.locate(step.in, step.target);
      await element.click(step.force === true ? { force: true } : {});
      if (step.keepPointer !== true) ctx.hovering = false;
      return;
    }
    case "hover":
      await (await win.locate(step.in, step.target)).hover();
      return;
    case "type": {
      const field = await win.locate(step.in, step.target);
      await field.click();
      await field.fill(step.text);
      if (step.submit === true) await win.page.keyboard.press("Enter");
      return;
    }
    case "press":
      await win.page.keyboard.press(step.keys);
      return;
    case "write":
      await win.page.keyboard.insertText(step.text);
      return;
    case "blur":
      await (await win.webview(step.in)).locator("body").evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
      return;
    case "wait": {
      await (await win.locate(step.in, step.target)).waitFor({ state: step.until ?? "visible" });
      return;
    }
    case "pause":
      await win.page.waitForTimeout(step.ms);
      return;
    case "scroll":
      await (await win.locate(step.in, step.target)).evaluate((element) => element.scrollIntoView({ block: "start" }));
      return;
    case "layout": {
      if (step.closeEditors === true) await win.command("workbench.action.closeAllEditors");
      if (step.sidebar !== undefined) await win.command(SIDEBAR[step.sidebar]);
      if (step.chat === "shown") await win.command("trama.ompChatSidebar.focus");
      if (step.chat === "hidden") await win.command("workbench.action.closeAuxiliaryBar");
      if (step.terminal === "shown") await win.command("workbench.action.terminal.toggleTerminal");
      if (step.terminal === "hidden") await win.command("workbench.action.closePanel");
      return;
    }
    case "job": {
      const count = step.count ?? 1;
      await waitFor(`${count} job(s) of the agent to start`, () => (jobs(ctx.standin).length >= count ? true : undefined));
      return;
    }
    case "agent": {
      const started = await waitFor("a job of the agent to run commands as", () => {
        const all = jobs(ctx.standin);
        return step.job === undefined ? all.at(-1) : all[step.job];
      });
      const own: Runner = { ...ctx.run, env: started.env };
      for (const command of step.commands) {
        if (command.wait === false) ctx.running.push(tramaStart(own, command));
        else await tramaRun(own, command);
      }
      return;
    }
    case "agent-env": {
      const started = await waitFor("a job of the agent to run commands as", () => jobs(ctx.standin).at(-1));
      ctx.run.env = started.env;
      return;
    }
    case "finish": {
      const started = await waitFor("a job of the agent to finish", () => {
        const all = jobs(ctx.standin);
        return step.job === undefined ? all.at(-1) : all[step.job];
      });
      // The stand-in omp ends the turn it holds once this file exists (`omp-standin.ts`).
      mkdirSync(join(ctx.standin, "finish"), { recursive: true });
      writeFileSync(join(ctx.standin, "finish", started.terminal), "");
      return;
    }
    case "setting":
      await win.setSetting({}, { [step.key]: step.value });
      return;
    case "file-exists": {
      const file = join(ctx.run.folder, step.path);
      await waitFor(`${step.path} to exist`, () => (existsSync(file) && (step.contains === undefined || readFileSync(file, "utf8").includes(step.contains)) ? true : undefined));
      return;
    }
  }
}
