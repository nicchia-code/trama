import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { writeFileAtomic } from "./atomic-write";
import { TramaError } from "./errors";
import { git, gitAsync } from "./git";
import { type Project, writeFileEnsuringDir } from "./store";

/*
 * Manager mode: whether this working copy uses Team. It is recorded in `.trama/manager/mode.json`, a folder with its own
 * `.gitignore`, so it stays local to the working copy even when `.trama/` is tracked, and is never committed. Team needs the
 * project's repository on GitHub, read from the `origin` remote.
 */

/** Why Manager mode cannot be turned on, from the Settings tab, the wizard and the command line. */
export const MANAGER_NEEDS_GITHUB = "Manager Mode needs a repository on GitHub (the origin remote).";

/** What the repository line says when the project has no `origin` remote, or git cannot tell. */
export const NO_ORIGIN = "No origin remote";
/** What the repository line says when `origin` is not a repository on GitHub. */
export const ORIGIN_NOT_GITHUB = "Origin is not on GitHub";

/** Where Manager mode is recorded, and the folder that holds it. */
export const managerDir = (p: Project): string => join(p.dir, "manager");
export const managerFile = (p: Project): string => join(managerDir(p), "mode.json");

/** Manager mode of the project: on while its file is there, whatever the file holds. */
export const readManagerMode = (p: Project): boolean => existsSync(managerFile(p));

// `owner/repo` of GitHub, without a final `.git`: the repository name is lazy so that `.git` is left to its own group.
const REPOSITORY = String.raw`([A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)/([A-Za-z0-9._-]+?)(?:\.git)?/?`;
const GITHUB_ADDRESSES = [new RegExp(String.raw`^https?://github\.com/${REPOSITORY}$`, "i"), new RegExp(String.raw`^git@github\.com:${REPOSITORY}$`, "i"), new RegExp(String.raw`^ssh://git@github\.com/${REPOSITORY}$`, "i")];

/**
 * The repository `<owner>/<repo>`, in lower case, an `origin` address names when it is on GitHub: `https://github.com/<owner>/<repo>`,
 * `http://github.com/<owner>/<repo>`, `git@github.com:<owner>/<repo>` or `ssh://git@github.com/<owner>/<repo>`, each with or without a final
 * `.git` and a final `/`. Any other address, a GitHub Enterprise host included, is null.
 */
export function parseGithubRepository(address: string): string | null {
  const trimmed = address.trim();
  for (const pattern of GITHUB_ADDRESSES) {
    const match = pattern.exec(trimmed);
    if (match !== null) return `${match[1]}/${match[2]}`.toLowerCase();
  }
  return null;
}

/** What the project's `origin` remote says: the GitHub repository, or why there is none (`reason` is the line the Settings tab and the wizard show). */
export interface Origin {
  repository: string | null;
  reason: string | null;
}

/** The origin of a working copy, from the output of `git remote get-url origin` (null when git could not tell). */
export function originOf(address: string | null): Origin {
  if (address === null || address.trim() === "") return { repository: null, reason: NO_ORIGIN };
  const repository = parseGithubRepository(address);
  return repository === null ? { repository: null, reason: ORIGIN_NOT_GITHUB } : { repository, reason: null };
}

/** The origin of the folder `root`, read with `git remote get-url origin`. No origin, no git or a failed git call is no origin remote. Synchronous: the command line's. */
export const readOrigin = (root: string): Origin => originOf(git(root, ["remote", "get-url", "origin"]));

/** The same read without holding the process: what the editor's host uses, once per window and for the folders of the wizard. */
export const readOriginAsync = async (root: string): Promise<Origin> => originOf(await gitAsync(root, ["remote", "get-url", "origin"]));

/** Where the origin of a project comes from while an editor window keeps it: the folder asked about, the origin the window knows. */
export type OriginSource = (root: string) => Origin;

let originSource: OriginSource | undefined;

/**
 * The editor's host installs the origin its window keeps (`extension/src/host/origin.ts`), so that no function below starts a process while the window runs; the command line installs
 * nothing and reads origin with git. Returns the function that takes the source off again.
 */
export function useOriginSource(source: OriginSource): () => void {
  originSource = source;
  return () => {
    if (originSource === source) originSource = undefined;
  };
}

/** The origin of the project at `root`: the window's value when an editor keeps one, else what git says now. What the commands that run inside the editor's host read, so they start no process there. */
export const currentOrigin = (root: string): Origin => (originSource === undefined ? readOrigin(root) : originSource(root));

/** What the Settings tab and the wizard need: whether Manager mode is recorded, the origin, and whether Team is available (recorded and origin on GitHub). */
export interface ManagerStatus extends Origin {
  available: boolean;
  recorded: boolean;
}

export function managerStatus(p: Project): ManagerStatus {
  const origin = currentOrigin(p.root);
  const recorded = readManagerMode(p);
  return { ...origin, recorded, available: recorded && origin.repository !== null };
}

/** Why Team is not available, from the command line and the host (`rules#manager-mode`): Manager mode is off, or the project's repository is not on GitHub. */
export const MANAGER_OFF = "Manager Mode is off in this working copy.";

/** Why Team is not available in this working copy, or null when it is. */
export function teamUnavailableReason(p: Project): string | null {
  const status = managerStatus(p);
  if (status.available) return null;
  return status.recorded ? MANAGER_NEEDS_GITHUB : MANAGER_OFF;
}

/** Refuses, with the reason of `rules#manager-mode`, unless Team is available. */
export function requireTeam(p: Project): void {
  const reason = teamUnavailableReason(p);
  if (reason !== null) throw new TramaError(reason);
}

/**
 * Turns Manager mode of the project on or off. On writes `.trama/manager/mode.json` (`{}`, LF, final newline) and, when it is not there, the `.gitignore` of the
 * folder; without origin on GitHub it refuses with `Manager Mode needs a repository on GitHub (the origin remote).` and writes nothing. Off deletes only the file, leaving
 * the folder with its `.gitignore` and every other file of Trama. A failed write says why.
 */
export function setManagerMode(p: Project, on: boolean): Origin {
  const origin = currentOrigin(p.root);
  if (on && origin.repository === null) throw new TramaError(MANAGER_NEEDS_GITHUB);
  const file = managerFile(p);
  try {
    if (on) {
      const ignore = join(managerDir(p), ".gitignore");
      if (!existsSync(ignore)) writeFileEnsuringDir(ignore, "*\n");
      writeFileAtomic(file, "{}\n");
    } else rmSync(file, { force: true });
  } catch (error) {
    throw new TramaError(`Could not write ${file}: ${error instanceof Error ? error.message : String(error)}`);
  }
  return origin;
}
