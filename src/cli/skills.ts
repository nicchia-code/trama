import { existsSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import design from "../../skills/trama-design/SKILL.md" with { type: "text" };
import designFormat from "../../skills/trama-design/FORMAT.md" with { type: "text" };
import setup from "../../skills/trama-setup/SKILL.md" with { type: "text" };
import implement from "../../skills/trama-implement/SKILL.md" with { type: "text" };
import importSkill from "../../skills/trama-import/SKILL.md" with { type: "text" };
import resolveDrifts from "../../skills/trama-resolve-drifts/SKILL.md" with { type: "text" };
import scan from "../../skills/trama-scan/SKILL.md" with { type: "text" };
import { SKILL_DIRS } from "../core/requirement-skills";
import { readTextLf, writeFileEnsuringDir } from "../core/store";
import { SUB_AGENTS } from "../core/sub-agents";

/** Skill files, embedded in the binary: path relative to the skills directory -> content. */
export const SKILLS: Record<string, string> = {
  "trama-design/SKILL.md": design,
  "trama-design/FORMAT.md": designFormat,
  "trama-setup/SKILL.md": setup,
  "trama-scan/SKILL.md": scan,
  "trama-implement/SKILL.md": implement,
  "trama-import/SKILL.md": importSkill,
  "trama-resolve-drifts/SKILL.md": resolveDrifts,
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

/** Writes `content` to `path` unless the file already holds it, so an install leaves unchanged files alone; returns `path`. */
function writeIfChanged(path: string, content: string): string {
  if (!existsSync(path) || readTextLf(path) !== content) writeFileEnsuringDir(path, content);
  return path;
}

/** Writes the skills under `dir`, replacing any previous copy whose content differs; returns every skill path. */
export function installSkills(dir: string): string[] {
  return Object.entries(SKILLS).map(([rel, content]) => writeIfChanged(join(dir, rel), content));
}

/** omp's default role for the Machine-comparison sub-agent; Trama passes `--slow` with the scan model when set. */
const OMP_ROLES = [["trama-analysis", "@slow"]] as const;

/** omp's definitions of the scan's sub-agents, as they are installed in the project's `.omp/agents/`: path -> content. */
export function ompAgentFiles(root: string): Record<string, string> {
  return Object.fromEntries(
    OMP_ROLES.map(([name, model]) => {
      const { description, prompt } = SUB_AGENTS[name];
      return [join(root, ".omp", "agents", `${name}.md`), `---\nname: ${name}\ndescription: ${JSON.stringify(description)}\nmodel: "${model}"\n---\n\n${prompt}\n`];
    }),
  );
}

/** Existing omp sub-agent definitions under `root` whose content differs from ours, i.e. what an install would destroy. */
export function ompAgentConflicts(root: string): string[] {
  return Object.entries(ompAgentFiles(root))
    .filter(([path, content]) => existsSync(path) && readTextLf(path) !== content)
    .map(([path]) => path);
}

/** Writes omp's definitions of the scan's sub-agents into the project's `.omp/agents/`, replacing any previous copy whose content differs; returns every path. */
export function installOmpAgents(root: string): string[] {
  return Object.entries(ompAgentFiles(root)).map(([path, content]) => writeIfChanged(path, content));
}
