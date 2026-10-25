import { git } from "../../../src/core/git";
import { readSoloMode, type SoloKind, setSoloMode, soloStatus } from "../../../src/core/solo-mode";
import type { Project } from "../../../src/core/store";
import type { ToWebview } from "../protocol";
import { configuredSkillsDir } from "./agent";

/** Whether `root` is inside a git working tree: what the first setup's wizard needs to offer Solo mode there. */
export const inGitRepository = (root: string): boolean => git(root, ["rev-parse", "--is-inside-work-tree"])?.trim() === "true";

/** The `soloMode` message of the project now: read through the same in-process code as `trama project edit`, with the configured skills folder. */
export function soloModeMessage(project: Project): Extract<ToWebview, { type: "soloMode" }> {
  return { type: "soloMode", ...soloStatus(project, configuredSkillsDir()) };
}

/** Writes Solo mode of the project (`.trama/solo/` and git's local `info/exclude` only); throws with the reason when it cannot. With `onlyIfChanged` nothing is written when the project already has that kind. */
export function writeSoloMode(project: Project, solo: SoloKind, onlyIfChanged = false): void {
  if (onlyIfChanged && readSoloMode(project) === solo) return;
  setSoloMode(project, solo, configuredSkillsDir());
}
