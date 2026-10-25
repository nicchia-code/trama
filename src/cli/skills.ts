import { existsSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { watchdogFile } from "../core/advisors";
import { SUB_AGENTS } from "../core/sub-agents";
import design from "../../skills/trama-design/SKILL.md" with { type: "text" };
import designFormat from "../../skills/trama-design/FORMAT.md" with { type: "text" };
import setup from "../../skills/trama-setup/SKILL.md" with { type: "text" };
import implement from "../../skills/trama-implement/SKILL.md" with { type: "text" };
import importSkill from "../../skills/trama-import/SKILL.md" with { type: "text" };
import resolveDrifts from "../../skills/trama-resolve-drifts/SKILL.md" with { type: "text" };
import scan from "../../skills/trama-scan/SKILL.md" with { type: "text" };
import compare from "../../skills/trama-compare/SKILL.md" with { type: "text" };
import merge from "../../skills/trama-merge/SKILL.md" with { type: "text" };
import handoff from "../../skills/trama-handoff/SKILL.md" with { type: "text" };
import { SKILL_DIRS } from "../core/requirement-skills";
import { normalizeLf } from "../core/line-endings";
import { readTextLf, writeFileEnsuringDir } from "../core/store";

/** Skill files, embedded in the binary: path relative to the skills directory -> content. The text is LF-normalised: a CRLF checkout embeds the same text as Linux, so an installed copy compares equal. */
export const SKILLS: Record<string, string> = {
  "trama-design/SKILL.md": normalizeLf(design),
  "trama-design/FORMAT.md": normalizeLf(designFormat),
  "trama-setup/SKILL.md": normalizeLf(setup),
  "trama-scan/SKILL.md": normalizeLf(scan),
  "trama-implement/SKILL.md": normalizeLf(implement),
  "trama-import/SKILL.md": normalizeLf(importSkill),
  "trama-resolve-drifts/SKILL.md": normalizeLf(resolveDrifts),
  "trama-compare/SKILL.md": normalizeLf(compare),
  "trama-merge/SKILL.md": normalizeLf(merge),
  "trama-handoff/SKILL.md": normalizeLf(handoff),
};

/** Skill folders that earlier versions installed and that no longer exist. */
export const RETIRED_SKILLS = ["trama-fix"];

/** Removes obsolete omp sub-agent definitions, whatever they contain. */
export function removeRetiredOmpAgents(root: string): string[] {
  const path = join(root, ".omp", "agents", "trama-triage.md");
  if (!existsSync(path)) return [];
  rmSync(path, { force: true });
  return [path];
}

/** Deletes the retired skill folders from the usual skill folders of the project and from `extraDirs`; returns the folders deleted. */
export function removeRetiredSkills(root: string, extraDirs: string[] = []): string[] {
  const dirs = [...new Set([...SKILL_DIRS, ...extraDirs].map((d) => resolve(root, d)))];
  return dirs
    .flatMap((dir) => RETIRED_SKILLS.map((name) => join(dir, name)))
    .filter((path) => existsSync(path))
    .map((path) => (rmSync(path, { recursive: true, force: true }), path));
}

/** Existing skill files under `dir` whose content differs from ours, i.e. what an install would destroy. */
export function skillConflicts(dir: string): string[] {
  return Object.entries(SKILLS)
    .map(([rel, content]) => ({ path: join(dir, rel), content }))
    .filter(({ path, content }) => existsSync(path) && readTextLf(path) !== content)
    .map(({ path }) => path);
}

/** Skill files of this version that are not under `dir` yet. */
export function missingSkills(dir: string): string[] {
  return Object.keys(SKILLS)
    .map((rel) => join(dir, rel))
    .filter((path) => !existsSync(path));
}

/** Writes `content` to `path` unless the file already holds it; returns whether it wrote. */
function writeChanged(path: string, content: string): boolean {
  if (existsSync(path) && readTextLf(path) === content) return false;
  writeFileEnsuringDir(path, content);
  return true;
}

/** Writes `content` to `path` unless the file already holds it, so an install leaves unchanged files alone; returns `path`. */
function writeIfChanged(path: string, content: string): string {
  writeChanged(path, content);
  return path;
}

/** Writes the skills under `dir`, replacing any previous copy whose content differs; returns every skill path. */
export function installSkills(dir: string): string[] {
  return Object.entries(SKILLS).map(([rel, content]) => writeIfChanged(join(dir, rel), content));
}

/** omp's role for each sub-agent, as `[name, model]`. `trama-analysis` takes omp's `@slow` role, which Trama passes `--slow` with the scan model when set. `trama-implementer` names no model, so it uses the model of the main process (`--model`). */
const OMP_ROLES = [["trama-analysis", "@slow"], ["trama-implementer", undefined]] as const;

/** omp's definitions of the scan's sub-agents and the Advisor Scanner's advisors (`.omp/WATCHDOG.yml`), as they are installed in the project's `.omp/`: path -> content. */
export function ompAgentFiles(root: string): Record<string, string> {
  const agents = Object.fromEntries(
    OMP_ROLES.map(([name, model]) => {
      const { description, prompt } = SUB_AGENTS[name];
      const modelLine = model === undefined ? "" : `model: "${model}"\n`;
      return [join(root, ".omp", "agents", `${name}.md`), `---\nname: ${name}\ndescription: ${JSON.stringify(description)}\n${modelLine}---\n\n${prompt}\n`];
    }),
  );
  return { ...agents, [join(root, ".omp", "WATCHDOG.yml")]: watchdogFile() };
}

/** Existing omp sub-agent definitions under `root` whose content differs from ours, i.e. what an install would destroy. */
export function ompAgentConflicts(root: string): string[] {
  return Object.entries(ompAgentFiles(root))
    .filter(([path, content]) => existsSync(path) && readTextLf(path) !== content)
    .map(([path]) => path);
}

/**
 * Writes omp's definitions of the scan's sub-agents and the advisor instructions into the project's `.omp/`, replacing
 * any previous copy whose content differs. Returns every path, and the ones it actually wrote.
 */
export function installOmpAgents(root: string): { paths: string[]; changed: string[] } {
  const files = Object.entries(ompAgentFiles(root));
  return { paths: files.map(([path]) => path), changed: files.filter(([path, content]) => writeChanged(path, content)).map(([path]) => path) };
}
