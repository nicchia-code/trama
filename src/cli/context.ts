import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { TramaError } from "../core/errors";
import type { AgentOrigin } from "../core/announcements";
import { findProject, projectAt, type Project, TRAMA_DIR } from "../core/store";
import { syncShortNumbers } from "../core/short-numbers";

/** What a command runs in: the folder, the project, and who runs it. */
export interface Context {
  cwd: string;
  rootOption?: string;
  /** True when the command runs as the agent: in the terminal Trama started for it (`TRAMA_AGENT`) or in Cursor's chat (`CURSOR_AGENT`). */
  byAgent: boolean;
  /** The agent terminal (`TRAMA_TERMINAL`) or the chat (`CURSOR_AGENT`) the command runs in, when either is known. */
  origin: AgentOrigin;
  /** The autopilot job this agent terminal was started for (`TRAMA_JOB`), when there is one. */
  job?: string;
  /** Whether the terminal carries the sign of a Run with the Advisor Scanner on (`TRAMA_ADVISOR_SCANNER` is `1`). */
  advisorScanner: boolean;
  project(assignNumbers?: boolean): Project;
}

/** The autopilot job of the agent's terminal (`TRAMA_JOB`), when the environment names one. */
export const jobFromEnv = (env: Record<string, string | undefined>): string | undefined => env["TRAMA_JOB"]?.trim() || undefined;

export function makeContext(cwd: string, rootOption?: string, byAgent = false, origin: AgentOrigin = {}, job?: string, advisorScanner = false): Context {
  let numbered = false;
  return {
    cwd,
    rootOption,
    byAgent,
    origin,
    job,
    advisorScanner,
    project(assignNumbers = true) {
      const project = rootOption === undefined ? findProject(cwd) : projectAt(resolve(cwd, rootOption));
      if (rootOption !== undefined && !existsSync(project.dir)) throw new TramaError(`No ${TRAMA_DIR}/ in ${project.root}. Run "trama project new".`);
      // A command is a reading of the working copy: cards it has not seen yet take their short number before it acts.
      if (assignNumbers && !numbered) {
        numbered = true;
        syncShortNumbers(project);
      }
      return project;
    },
  };
}
