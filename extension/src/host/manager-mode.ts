import { managerStatus, readManagerMode, setManagerMode } from "../../../src/core/manager-mode";
import type { Project } from "../../../src/core/store";
import type { ToWebview } from "../protocol";

/** The `managerMode` message of the project now: read through the same in-process code as `trama project edit`, with the origin read again at every call. */
export function managerModeMessage(project: Project): Extract<ToWebview, { type: "managerMode" }> {
  const { available, recorded, repository, reason } = managerStatus(project);
  return { type: "managerMode", available, recorded, repository, reason };
}

/** Writes Manager mode of the project (`.trama/manager/mode.json` only); throws with the reason when it cannot. With `onlyIfChanged` nothing is written when the project already has that value. */
export function writeManagerMode(project: Project, on: boolean, onlyIfChanged = false): void {
  if (onlyIfChanged && readManagerMode(project) === on) return;
  setManagerMode(project, on);
}
