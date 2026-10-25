import { existsSync, mkdirSync, rmSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { z } from "zod";
import { TramaError } from "../../core/errors";
import { MANAGER_NEEDS_GITHUB, type Origin, readManagerMode, readOrigin, setManagerMode } from "../../core/manager-mode";
import { createDefaultAreas } from "../../core/requirements";
import { describeRequirementSkillSync, syncRequirementSkills } from "../../core/requirement-skills";
import { currentSolo, type SoloResult, setSoloMode } from "../../core/solo-mode";
import { projectAt, requirementsDir, writeFileEnsuringDir } from "../../core/store";
import { defineCommand } from "../registry";
import { text } from "../result";
import { refreshProjectSkills } from "../skill-refresh";
import { installOmpAgents, installSkills, ompAgentConflicts, skillConflicts } from "../skills";
import { boardView } from "../work";

const skillsDir = z.string().min(1).optional().describe("The folder of the agent skills, relative to the project root. Default `.agents/skills`.");
const stringList = z.array(z.string());
const soloKind = z.enum(["off", "folders", "files"]);
const solo = soloKind.optional().describe("Solo mode of this working copy: `off`, `folders` (keeps `.trama/`, the skills folder and `.omp/` out of git) or `files` (keeps only the files Trama writes there). The block goes in `.git/info/exclude`, never committed. Needs a git repository.");
const soloOutput = {
  solo: soloKind.describe("Solo mode now."),
  tracked: stringList.describe("Trama's files git already tracks under the paths Solo mode keeps out of git, relative to the project root; their changes still enter commits. Empty when Solo mode is off."),
};
const manager = z.boolean().optional().describe("Manager mode of this working copy: `true` records it in `.trama/manager/mode.json` (local, never committed; refused when `origin` is not a repository on GitHub), `false` deletes that file. Never deletes the people or the files of Team's work.");
const managerOutput = {
  manager: z.boolean().describe("Manager mode as recorded."),
  managerRepository: z.string().nullable().describe("The GitHub repository `<owner>/<repo>` of `origin`, or null when origin is not on GitHub."),
};

/** The lines of a result that tell Manager mode: nothing when it is off and was not asked for. */
function managerLines(recorded: boolean, origin: Origin, asked: boolean): string[] {
  if (!recorded) return asked ? ["Manager mode is off."] : [];
  return [origin.repository === null ? "Manager mode is on, but origin is not on GitHub." : `Manager mode is on (${origin.repository}).`];
}

/** The lines of a result that tell Solo mode: nothing when it is off and was not asked for. */
function soloLines(result: SoloResult, asked: boolean): string[] {
  if (result.solo === "off") return asked ? ["Solo mode is off."] : [];
  const kept = result.solo === "folders" ? "`.trama/`, the skills folder and `.omp/`" : "`.trama/`, the `trama-*` skills and the files Trama writes in `.omp/`";
  return [
    `Solo mode is on: ${kept} are kept out of git by the local exclusions of git (\`.git/info/exclude\`).`,
    ...(result.tracked.length === 0 ? [] : [`These Trama files are tracked by git, so their changes are still committed:\n${result.tracked.map((path) => `- ${path}`).join("\n")}`]),
  ];
}

const create = defineCommand({
  object: "project",
  verb: "new",
  mode: "immediate",
  summary: "Create `.trama/` and install the agent skills and omp's sub-agent definitions.",
  description:
    "Creates `.trama/` in `--root` (or the current directory; it never walks up) with `model/system.md`, `model/actors/`, `requirements/` with the five starting Areas, `proposals/`, `tasks/` and `drifts/`, and installs the agent skills, embedded in the binary, and omp's sub-agent definitions. It refuses, creating nothing, when `.trama/` already exists or when a file to install exists with different content, unless `force` is true; identical files are not a conflict. With `solo` (`folders` or `files`) it first writes Solo mode (`.trama/solo/mode.json` and the block in `.git/info/exclude`, so no file of Trama is ever visible to git) and creates nothing at all, failing with `Solo mode needs a git repository.`, when the folder is not in a git repository or the write fails. With `manager: true` it writes Manager mode (`.trama/manager/mode.json`) after every file of the project; when `origin` is not a repository on GitHub, or the write fails, the project stays, Manager mode stays off and the output says why (`managerError`).",
  input: z.strictObject({
    skillsDir,
    force: z.boolean().optional().describe("Overwrite skill files, sub-agent definitions and advisor instructions that differ from Trama's. Default false."),
    solo,
    manager,
  }),
  output: z.object({ path: z.string(), skillsDir: z.string(), skills: stringList.describe("The skill files installed."), agents: stringList.describe("The omp definitions written."), areas: stringList.describe("The Requirement Areas created."), ...soloOutput, ...managerOutput, managerError: z.string().nullable().describe("Why Manager mode was asked for and not written, or null; the project is created either way.") }),
  example: { skillsDir: ".agents/skills" },
  effects: { writes: true },
  run(ctx, input) {
    const root = resolve(ctx.cwd, ctx.rootOption ?? ".");
    const project = projectAt(root);
    if (existsSync(project.dir)) throw new TramaError(`${project.dir} already exists`);
    const skills = resolve(root, input.skillsDir ?? ".agents/skills");
    const conflicts = input.force === true ? [] : [...skillConflicts(skills), ...ompAgentConflicts(root)];
    if (conflicts.length > 0)
      throw new TramaError(`Refusing to overwrite agent files that differ from Trama's:\n${conflicts.map((c) => `- ${c}`).join("\n")}\nNothing was created. Move them, pick another skillsDir, or pass "force": true.`);
    // Solo mode goes first, so no file of Trama is ever visible to git; a refusal or a failure creates nothing.
    if (input.solo !== undefined && input.solo !== "off") {
      try {
        setSoloMode(project, input.solo, input.skillsDir);
      } catch (error) {
        rmSync(project.dir, { recursive: true, force: true });
        throw error;
      }
    }
    for (const d of ["model/actors", "proposals", "tasks", "drifts"]) {
      mkdirSync(join(project.dir, d), { recursive: true });
      writeFileEnsuringDir(join(project.dir, d, ".gitkeep"), "");
    }
    const name = basename(root).replace(/[-_]+/g, " ").replace(/^./, (c) => c.toUpperCase());
    writeFileEnsuringDir(join(project.dir, "model", "system.md"), `# ${name}\n\nDescribe what this System is and who it is for.\n`);
    const areas = createDefaultAreas(project);
    const installed = installSkills(skills);
    const agents = installOmpAgents(root).paths;
    syncRequirementSkills(project, [skills]);
    const soloResult = currentSolo(project, input.skillsDir);
    // Manager mode goes last, after every file of the project; when it cannot be written the project stays and the failure is told.
    let managerError: string | null = null;
    if (input.manager === true) {
      try {
        setManagerMode(project, true);
      } catch (error) {
        managerError = error instanceof Error ? error.message : String(error);
      }
    }
    const recorded = readManagerMode(project);
    const origin = readOrigin(project.root);
    const managerLine = managerError === null ? managerLines(recorded, origin, false) : [`Manager mode was not turned on: ${managerError}`];
    return text([`Created ${project.dir} with ${areas.length} Requirement Areas`, `Installed ${installed.length} skill files in ${skills}`, `Installed omp's sub-agent definitions: ${agents.join(", ")}`, ...soloLines(soloResult, false), ...managerLine].join("\n"), { path: project.dir, skillsDir: skills, skills: installed, agents, areas, ...soloResult, manager: recorded, managerRepository: origin.repository, managerError });
  },
});

const edit = defineCommand({
  object: "project",
  verb: "edit",
  mode: "immediate",
  summary: "Install this version's agent skills into the project and regenerate the Requirement skills, or change Solo mode.",
  description:
    "Writes this version's agent skills into the project's skill folder, replacing older or edited copies, and lists the files it changed; deletes the retired `trama-fix` skill; adds the starting Requirement Areas when the project has none; moves single-file Areas into Area folders; regenerates the `trama-req-*` skills; and rewrites omp's sub-agent definition and the advisor instructions. With `solo` alone it changes only Solo mode and installs nothing: it records the choice in `.trama/solo/mode.json` and rewrites the block in `.git/info/exclude` (`off` removes both). With `solo` and `skillsDir` the block covers that skills folder; without `skillsDir` it covers `.agents/skills`. `solo` other than `off` needs a git repository, otherwise it fails with `Solo mode needs a git repository.` and writes nothing. The result carries `solo` and `tracked`, Trama's files git already tracks, whose changes still enter commits. With Solo mode on, the skills update also writes the block again when it is missing or different. With `manager` (alone, or with `solo`, without `skillsDir`) it changes only Manager mode and installs nothing: `true` writes `.trama/manager/mode.json`, and fails with `Manager Mode needs a repository on GitHub (the origin remote).` writing nothing when `origin` is not a repository on GitHub; `false` deletes that file and nothing else. The result carries `manager` and `managerRepository`.",
  input: z.strictObject({ skillsDir, solo, manager }),
  output: z.object({
    skillsDir: z.string().optional().describe("The skills folder; absent when only `solo` was given."),
    changed: stringList.optional().describe("The skill files this run wrote."),
    removed: stringList.optional().describe("The retired skill folders deleted."),
    removedAgents: stringList.optional(),
    agents: stringList.optional(),
    agentsChanged: stringList.optional().describe("The omp definitions and advisor instructions this run actually wrote."),
    areas: stringList.optional().describe("The starting Areas created."),
    conversion: z.looseObject({}).optional().describe("The Areas moved to the folder format and those left as they were."),
    generated: z.looseObject({}).optional().describe("The regeneration of the Requirement skills."),
    ...soloOutput,
    ...managerOutput,
  }),
  example: { skillsDir: ".agents/skills" },
  effects: { writes: true },
  run(ctx, input) {
    const project = ctx.project();
    // A refusal comes before any write, so `solo` and `manager` together never leave one of them done.
    if (input.manager === true && readOrigin(project.root).repository === null) throw new TramaError(MANAGER_NEEDS_GITHUB);
    let soloOnly: SoloResult | undefined;
    if (input.solo !== undefined) {
      const result = setSoloMode(project, input.solo, input.skillsDir);
      if (input.skillsDir === undefined) soloOnly = result;
    }
    if (input.manager !== undefined) setManagerMode(project, input.manager);
    const recorded = readManagerMode(project);
    const origin = readOrigin(project.root);
    const managerResult = { manager: recorded, managerRepository: origin.repository };
    // `solo` and `manager` without `skillsDir` change only themselves and install nothing.
    if (input.skillsDir === undefined && (input.solo !== undefined || input.manager !== undefined)) {
      const lines = [...(soloOnly === undefined ? [] : soloLines(soloOnly, true)), ...(input.manager === undefined ? [] : managerLines(recorded, origin, true))];
      return text(lines.join("\n"), { ...(soloOnly ?? {}), ...(input.manager === undefined ? {} : managerResult) });
    }
    const { skillsDir: skills, changed, removed, removedAgents, agents, agentsChanged, areas, conversion, generated } = refreshProjectSkills(project, input.skillsDir, true);
    const soloResult = currentSolo(project, input.skillsDir);
    const lines = [
      changed.length === 0 ? `Skills in ${skills} are already up to date.` : `Updated ${changed.length} skill file(s) in ${skills}:\n${changed.map((c) => `- ${c}`).join("\n")}`,
      removed.length > 0 ? `Deleted the retired trama-fix skill: ${removed.join(", ")}` : "",
      removedAgents.length > 0 ? `Deleted the retired omp sub-agent definition: ${removedAgents.join(", ")}` : "",
      `Installed omp's sub-agent definitions: ${agents.join(", ")}`,
      areas.length > 0 ? `Created ${areas.length} Requirement Areas in ${requirementsDir(project)}: ${areas.join(", ")}` : "",
      conversion.converted.length > 0 ? `Converted ${conversion.converted.length} single-file Requirement Area(s) to Area folders (area.md, and main.md with the sections): ${conversion.converted.join(", ")}` : "",
      conversion.skipped.length > 0 ? `Left ${conversion.skipped.length} single-file Requirement Area(s) as they were: ${conversion.skipped.map((s) => `${s.id} (${s.reason})`).join(", ")}` : "",
      describeRequirementSkillSync(generated),
      ...soloLines(soloResult, input.solo !== undefined),
      ...managerLines(recorded, origin, input.manager !== undefined),
    ];
    return text(lines.filter(Boolean).join("\n"), { skillsDir: skills, changed, removed, removedAgents, agents, agentsChanged, areas, conversion, generated, ...soloResult, ...managerResult });
  },
});

const show = defineCommand({
  object: "project",
  verb: "show",
  mode: "immediate",
  summary: "The Board: To decide, To do, In progress, Done.",
  description:
    "The Board as text. Draft Proposals are marked `(draft)` in **In writing**, apart from **To decide**, which shows handed-over Proposals and open Drifts; an open resolution Proposal and the Drifts it lists are one card. Each Task is listed in its column with the Proposal it comes from. Read-only.",
  input: z.strictObject({}),
  output: z.object({
    inWriting: z.array(z.looseObject({})).describe("Draft Proposals."),
    toDecide: z.object({ proposals: z.array(z.looseObject({})), drifts: z.array(z.looseObject({})) }),
    todo: z.array(z.looseObject({})),
    doing: z.array(z.looseObject({})),
    done: z.array(z.looseObject({})),
    solo: soloKind.describe("Solo mode of this working copy: `off`, `folders` or `files`."),
    ...managerOutput,
  }),
  run(ctx) {
    const project = ctx.project();
    const board = boardView(project);
    const recorded = readManagerMode(project);
    const { repository } = readOrigin(project.root);
    const line = !recorded ? "Manager mode: off" : repository === null ? "Manager mode: on, but origin is not on GitHub" : `Manager mode: on (${repository})`;
    return { ...board, md: `${board.md}\n\n${line}`, json: { ...(board.json as object), manager: recorded, managerRepository: repository } };
  },
});

export const PROJECT_COMMANDS = [create, edit, show];
