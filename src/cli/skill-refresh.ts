import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { type AreaConversion, convertSingleFileAreas, createDefaultAreas } from "../core/requirements";
import { type RequirementSkillSync, syncRequirementSkills } from "../core/requirement-skills";
import { repairSoloBlock } from "../core/solo-mode";
import { type Project, requirementsDir } from "../core/store";
import { installOmpAgents, installSkills, missingSkills, removeRetiredOmpAgents, removeRetiredSkills, skillConflicts } from "./skills";

/** What bringing a project's installed agent files in line with this version did. */
export interface SkillRefresh {
  skillsDir: string;
  /** Skill files that differed or were missing before the install. */
  changed: string[];
  /** Retired skill folders deleted. */
  removed: string[];
  /** Retired omp definitions deleted. */
  removedAgents: string[];
  /** Every omp definition Trama keeps in `.omp/`. */
  agents: string[];
  /** The omp definitions and advisor instructions the run actually wrote. */
  agentsChanged: string[];
  /** Starting Areas created. */
  areas: string[];
  conversion: AreaConversion;
  generated: RequirementSkillSync;
  /** Whether the run wrote or deleted any file; the lines that recur on every run do not count. */
  updated: boolean;
}

/**
 * Installs this version's skills, omp definitions and Requirement skills, deleting what earlier versions installed.
 * `areas` also creates the starting Areas and moves single-file Areas to Area folders: Update skills does, the check
 * when Trama opens does not.
 */
export function refreshProjectSkills(project: Project, skillsDir: string | undefined, areas: boolean): SkillRefresh {
  const skills = resolve(project.root, skillsDir ?? ".agents/skills");
  const changed = skillConflicts(skills).concat(missingSkills(skills));
  installSkills(skills);
  const installed = installOmpAgents(project.root);
  const removed = removeRetiredSkills(project.root, [skills]);
  const removedAgents = removeRetiredOmpAgents(project.root);
  const created = areas && !existsSync(requirementsDir(project)) ? createDefaultAreas(project) : [];
  const conversion: AreaConversion = areas ? convertSingleFileAreas(project) : { converted: [], skipped: [] };
  const generated = syncRequirementSkills(project, [skills]);
  // With Solo mode on, the block in `.git/info/exclude` is checked in the same pass; a failed write fails the refresh like any other.
  repairSoloBlock(project, skillsDir);
  const updated = changed.length + removed.length + removedAgents.length + installed.changed.length + generated.changed.length > 0;
  return { skillsDir: skills, changed, removed, removedAgents, agents: installed.paths, agentsChanged: installed.changed, areas: created, conversion, generated, updated };
}
