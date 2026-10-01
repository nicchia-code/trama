import { TramaError } from "../core/errors";
import { type Area, type ProjectModel, requirementsFor, resolveProjectRef } from "../core/requirements";
import { bullets, dash, type Result } from "./result";

const sectionTitle = (ref: string | null) => ref ?? "General";

function areaMd(area: Area): string {
  return [
    `# ${area.title} (\`requirements/${area.id}\`)`,
    "",
    `When: ${area.description || "_no description_"}`,
    area.intro ? `\n${area.intro}` : "",
    ...area.sections.flatMap((s) => ["", `## ${sectionTitle(s.ref)}`, "", s.text || "_empty_"]),
  ].join("\n");
}

/**
 * `trama requirements`: every Area with its sections; `requirements <area>`: one Area in full;
 * `requirements <model reference>`: the Requirements attached to that element or to what contains it.
 */
export function requirementsView(project: ProjectModel, arg?: string): Result {
  if (arg === undefined) {
    const md = [
      "# Requirements",
      "",
      bullets(
        project.areas.map((a) => `- \`requirements/${a.id}\` ${a.title}${dash(a.description)}\n  Sections: ${a.sections.filter((s) => s.text !== "").map((s) => sectionTitle(s.ref)).join(", ") || "_empty_"}`),
        "_No Areas in .trama/requirements/._",
      ),
    ].join("\n");
    return { md, json: { areas: project.areas } };
  }
  const area = project.areas.find((a) => a.id === arg || `requirements/${a.id}` === arg);
  if (area) return { md: areaMd(area), json: area };
  if (arg.startsWith("requirements/")) {
    const el = resolveProjectRef(project, arg);
    if (el.kind === "requirement" && el.section)
      return { md: `# ${el.area.title}: ${sectionTitle(el.section.ref)}\n\n${el.section.text || "_empty_"}`, json: { area: el.area.id, section: el.section } };
  }
  try {
    resolveProjectRef(project, arg);
  } catch (err) {
    throw new TramaError(`"${arg}" is neither an Area nor a Model reference. ${(err as Error).message}`);
  }
  const attached = requirementsFor(project, arg);
  const md = [`# Requirements for ${arg}`, "", attachedMd(project, arg)].join("\n");
  return { md, json: { ref: arg, requirements: attached.map((r) => ({ area: r.area.id, section: r.section.ref, attachedTo: r.ref, text: r.section.text })) } };
}

/** The Requirements attached to `ref` or what contains it, as Markdown bullets with quoted text. */
export function attachedMd(project: ProjectModel, ref: string): string {
  const lines = requirementsFor(project, ref).map(
    (r) => `- \`requirements/${r.area.id}#${r.section.ref}\`${r.ref === ref ? "" : ` (via ${r.ref})`}\n${r.section.text.split("\n").map((l) => `  > ${l}`).join("\n")}`,
  );
  return bullets(lines, "_No Requirements attached; the General ones of each Area still apply._");
}

/** Appends the attached Requirements to an explore view, when the project has any Areas. */
export function withRequirements(result: Result, project: ProjectModel, ref: string): Result {
  if (requirementsFor(project, ref).length === 0) return result;
  return { ...result, md: `${result.md.trimEnd()}\n\n## Requirements\n\n${attachedMd(project, ref)}` };
}
