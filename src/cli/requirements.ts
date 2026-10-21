import { TramaError } from "../core/errors";
import { requirementSkillNames } from "../core/requirement-skills";
import { type Area, type ProjectModel, type RequirementSection, requirementsFor, resolveProjectRef } from "../core/requirements";
import { bullets, dash } from "../core/describe";
import type { Result } from "./result";

const sectionTitle = (ref: string | null) => ref ?? "General";

/** The skill or skills to load for an Area or one of its sections, as the current mode generates them; "" when none is. */
function skillsNote(project: ProjectModel, area: Area, section: RequirementSection | null = null): string {
  const skills = requirementSkillNames(project, area, section);
  return skills.length === 0 ? "" : `skill${skills.length > 1 ? "s" : ""} ${skills.map((s) => `\`${s}\``).join(", ")}`;
}

function areaMd(project: ProjectModel, area: Area): string {
  const skills = skillsNote(project, area);
  return [
    `# ${area.title} (\`requirements/${area.id}\`)`,
    "",
    `When: ${area.description || "_no description_"}`,
    ...(skills ? [`Load: ${skills}`] : []),
    area.intro ? `\n${area.intro}` : "",
    ...area.sections.flatMap((s) => ["", `## ${sectionTitle(s.ref)}`, "", s.text || "_empty_"]),
  ].join("\n");
}

/**
 * `trama model show requirements`: every Area with its sections; `requirements/<area>`: one Area in full;
 * `requirements/<area>#<section>`: one section. The Requirements attached to a Model element follow that element's own view.
 */
export function requirementsView(project: ProjectModel, arg?: string): Result {
  if (arg === undefined) {
    const md = [
      "# Requirements",
      "",
      bullets(
        project.areas.map((a) => {
          const skills = skillsNote(project, a);
          return `- \`requirements/${a.id}\` ${a.title}${dash(a.description)}\n  Sections: ${a.sections.filter((s) => s.text !== "").map((s) => sectionTitle(s.ref)).join(", ") || "_empty_"}${skills ? `\n  Load: ${skills}` : ""}`;
        }),
        "_No Areas in .trama/requirements/._",
      ),
    ].join("\n");
    return { md, json: { areas: project.areas } };
  }
  const el = resolveProjectRef(project, arg);
  if (el.kind !== "requirement") throw new TramaError(`"${arg}" is not a Requirement reference (expected requirements/<area> or requirements/<area>#<section>)`);
  if (el.section === null) return { md: areaMd(project, el.area), json: el.area };
  return { md: `# ${el.area.title}: ${sectionTitle(el.section.ref)}\n\n${el.section.text || "_empty_"}`, json: { area: el.area.id, section: el.section } };
}

/** The Requirements attached to `ref` or what contains it, as Markdown bullets with quoted text. */
export function attachedMd(project: ProjectModel, ref: string): string {
  const lines = requirementsFor(project, ref).map((r) => {
    const skills = skillsNote(project, r.area, r.section);
    return `- \`requirements/${r.area.id}#${r.section.ref}\`${r.ref === ref ? "" : ` (via ${r.ref})`}${skills ? ` (${skills})` : ""}\n${r.section.text.split("\n").map((l) => `  > ${l}`).join("\n")}`;
  });
  return bullets(lines, "_No Requirements attached; the General ones of each Area still apply._");
}

/** Appends the attached Requirements to an explore view, when the project has any Areas. */
export function withRequirements(result: Result, project: ProjectModel, ref: string): Result {
  if (requirementsFor(project, ref).length === 0) return result;
  return { ...result, md: `${result.md.trimEnd()}\n\n## Requirements\n\n${attachedMd(project, ref)}` };
}
