import { existsSync, mkdirSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { z } from "zod";
import { TramaError } from "../../core/errors";
import { convertSingleFileAreas, createDefaultAreas } from "../../core/requirements";
import { describeRequirementSkillSync, syncRequirementSkills } from "../../core/requirement-skills";
import { projectAt, requirementsDir, writeFileEnsuringDir } from "../../core/store";
import { defineCommand } from "../registry";
import { text } from "../result";
import { installOmpAgents, installSkills, missingSkills, ompAgentConflicts, removeRetiredOmpAgents, removeRetiredSkills, skillConflicts } from "../skills";
import { boardView } from "../work";

const skillsDir = z.string().min(1).optional().describe("The folder of the agent skills, relative to the project root. Default `.agents/skills` (`.claude/skills` for Claude Code).");
const stringList = z.array(z.string());

const create = defineCommand({
  object: "project",
  verb: "new",
  mode: "immediate",
  summary: "Create `.trama/` and install the agent skills and omp's sub-agent definitions.",
  description:
    "Creates `.trama/` in `--root` (or the current directory; it never walks up) with `model/system.md`, `model/actors/`, `requirements/` with the five starting Areas, `proposals/`, `tasks/` and `drifts/`, and installs the agent skills, embedded in the binary, and omp's sub-agent definitions. It refuses, creating nothing, when `.trama/` already exists or when a file to install exists with different content, unless `force` is true; identical files are not a conflict.",
  input: z.strictObject({
    skillsDir,
    force: z.boolean().optional().describe("Overwrite skill files, sub-agent definitions and advisor instructions that differ from Trama's. Default false."),
  }),
  output: z.object({ path: z.string(), skillsDir: z.string(), skills: stringList.describe("The skill files installed."), agents: stringList.describe("The omp definitions written."), areas: stringList.describe("The Requirement Areas created.") }),
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
    for (const d of ["model/actors", "proposals", "tasks", "drifts"]) {
      mkdirSync(join(project.dir, d), { recursive: true });
      writeFileEnsuringDir(join(project.dir, d, ".gitkeep"), "");
    }
    const name = basename(root).replace(/[-_]+/g, " ").replace(/^./, (c) => c.toUpperCase());
    writeFileEnsuringDir(join(project.dir, "model", "system.md"), `# ${name}\n\nDescribe what this System is and who it is for.\n`);
    const areas = createDefaultAreas(project);
    const installed = installSkills(skills);
    const agents = installOmpAgents(root);
    syncRequirementSkills(project, [skills]);
    return text(`Created ${project.dir} with ${areas.length} Requirement Areas\nInstalled ${installed.length} skill files in ${skills}\nInstalled omp's sub-agent definitions: ${agents.join(", ")}`, { path: project.dir, skillsDir: skills, skills: installed, agents, areas });
  },
});

const edit = defineCommand({
  object: "project",
  verb: "edit",
  mode: "immediate",
  summary: "Install this version's agent skills into the project and regenerate the Requirement skills.",
  description:
    "Writes this version's agent skills into the project's skill folder, replacing older or edited copies, and lists the files it changed; deletes the retired `trama-fix` skill; adds the starting Requirement Areas when the project has none; moves single-file Areas into Area folders; regenerates the `trama-req-*` skills; and rewrites omp's sub-agent definition and the advisor instructions.",
  input: z.strictObject({ skillsDir }),
  output: z.object({
    skillsDir: z.string(),
    changed: stringList.describe("The skill files this run wrote."),
    removed: stringList.describe("The retired skill folders deleted."),
    removedAgents: stringList,
    agents: stringList,
    areas: stringList.describe("The starting Areas created."),
    conversion: z.looseObject({}).describe("The Areas moved to the folder format and those left as they were."),
    generated: z.looseObject({}).describe("The regeneration of the Requirement skills."),
  }),
  example: { skillsDir: ".agents/skills" },
  effects: { writes: true },
  run(ctx, input) {
    const project = ctx.project();
    const skills = resolve(project.root, input.skillsDir ?? ".agents/skills");
    const changed = skillConflicts(skills).concat(missingSkills(skills));
    installSkills(skills);
    const agents = installOmpAgents(project.root);
    const removed = removeRetiredSkills(project.root, [skills]);
    const removedAgents = removeRetiredOmpAgents(project.root);
    const areas = existsSync(requirementsDir(project)) ? [] : createDefaultAreas(project);
    const conversion = convertSingleFileAreas(project);
    const generated = syncRequirementSkills(project, [skills]);
    const lines = [
      changed.length === 0 ? `Skills in ${skills} are already up to date.` : `Updated ${changed.length} skill file(s) in ${skills}:\n${changed.map((c) => `- ${c}`).join("\n")}`,
      removed.length > 0 ? `Deleted the retired trama-fix skill: ${removed.join(", ")}` : "",
      removedAgents.length > 0 ? `Deleted the retired omp sub-agent definition: ${removedAgents.join(", ")}` : "",
      `Installed omp's sub-agent definitions: ${agents.join(", ")}`,
      areas.length > 0 ? `Created ${areas.length} Requirement Areas in ${requirementsDir(project)}: ${areas.join(", ")}` : "",
      conversion.converted.length > 0 ? `Converted ${conversion.converted.length} single-file Requirement Area(s) to Area folders (area.md, and main.md with the sections): ${conversion.converted.join(", ")}` : "",
      conversion.skipped.length > 0 ? `Left ${conversion.skipped.length} single-file Requirement Area(s) as they were: ${conversion.skipped.map((s) => `${s.id} (${s.reason})`).join(", ")}` : "",
      describeRequirementSkillSync(generated),
    ];
    return text(lines.filter(Boolean).join("\n"), { skillsDir: skills, changed, removed, removedAgents, agents, areas, conversion, generated });
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
  }),
  run: (ctx) => boardView(ctx.project()),
});

export const PROJECT_COMMANDS = [create, edit, show];
