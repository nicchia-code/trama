import { changes, health, listProposals, type Proposal, validateProposal } from "../core/proposals";
import { hasContent, loadProject, parseRequirementRef, type ProjectModel, requirementsFor, resolveProjectRef } from "../core/requirements";
import type { Project } from "../core/store";
import { formatDiagnostic } from "../core/model";
import { COLUMNS, type Drift, listDrifts, listTasks, type Task } from "../core/work";
import { bullets, dash, eventKey, marker, prose, type Result } from "./result";

/** One-line summary of a Proposal for lists and the board. */
export function proposalSummary(p: Project, proposal: Proposal) {
  const h = proposal.data.status === "open" ? health(p, proposal) : { stale: [], unbased: [] };
  return { id: proposal.id, title: proposal.title, status: proposal.data.status, stale: h.stale.length > 0 };
}

export function proposalListView(p: Project, all: boolean): Result {
  const items = listProposals(p)
    .filter((x) => all || x.data.status === "open")
    .map((x) => proposalSummary(p, x));
  const md = bullets(
    items.map((i) => `- ${i.id} [${i.status}${i.stale ? ", stale" : ""}] ${i.title}`),
    "_No Proposals._",
  );
  return { md: `# Proposals\n\n${md}`, json: { proposals: items } };
}

export function proposalShowView(p: Project, proposal: Proposal): Result {
  const h = proposal.data.status === "open" ? health(p, proposal) : { stale: [], unbased: [] };
  const fileChanges = changes(p, proposal);
  const errors = proposal.data.status === "open" ? validateProposal(p, proposal) : [];
  const md = [
    proposal.body.trim(),
    "",
    `Status: **${proposal.data.status}**${h.stale.length > 0 ? " (stale)" : ""}`,
    h.stale.length > 0 ? `\nStale: the Model changed since the Proposal touched ${h.stale.join(", ")}. It cannot be approved; write a new Proposal.` : "",
    h.unbased.length > 0 ? `\nFiles never registered with \`trama proposal edit\`: ${h.unbased.join(", ")}` : "",
    "",
    "## Changes",
    bullets(
      fileChanges.map((c) => [`- \`${c.path}\` (${c.change})`, ...c.details.map((d) => `  - ${d}`)].join("\n")),
      "_No files touched._",
    ),
    "",
    "## Validation of the Model and Requirements with the Proposal applied",
    errors.length === 0 ? "Valid." : errors.map((d) => `- ${formatDiagnostic(d)}`).join("\n"),
  ].join("\n");
  return {
    md,
    json: { id: proposal.id, title: proposal.title, status: proposal.data.status, stale: h.stale, unbased: h.unbased, changes: fileChanges, errors },
  };
}

const taskSummary = (t: Task) => ({ id: t.id, title: t.title, column: t.data.column, technical: t.data.technical, refs: t.data.refs, drift: t.data.drift });
const driftSummary = (d: Drift) => ({ id: d.id, title: d.title, status: d.data.status, resolution: d.data.resolution, refs: d.data.refs, proposal: d.data.proposal, task: d.data.task });

/** The current text of a Model element or Requirement, for inlining into a Task or Drift. */
export function describeRef(project: ProjectModel, ref: string): string {
  let el;
  try {
    el = resolveProjectRef(project, ref);
  } catch {
    return `_\`${ref}\` no longer resolves in the Model or its Requirements._`;
  }
  switch (el.kind) {
    case "feature":
      return `${el.feature.name}${dash(el.feature.description)}\nMachines: ${el.feature.machines.join(", ") || "_none_"}`;
    case "actor":
      return `${el.actor.name}${dash(el.actor.description)}\nEvents: ${el.actor.events.map((e) => e.name).join(", ") || "_none_"}`;
    case "machine":
      return `${el.machine.name}${dash(el.machine.description)}\nUse \`trama machine ${el.machine.id}\` for the full State tree.`;
    case "state":
      return [
        `${el.state.name}${marker(el.state)}${dash(el.state.description)}`,
        ...el.state.transitions.map((t) => `- \`${eventKey(t)}\` → ${t.target}${prose(t)}`),
      ].join("\n");
    case "transition":
      return el.transitions.map((t) => `- ${el.state.name}: \`${eventKey(t)}\` → ${t.target}${prose(t)}`).join("\n");
    case "event":
      return `${ref}${dash(el.event.description)}`;
    case "requirement":
      if (el.section) return `${el.area.title}, ${el.section.ref ?? "General"}:\n${el.section.text || "_empty_"}`;
      return `${el.area.title}: ${el.area.sections.filter((s) => s.text !== "").map((s) => s.ref ?? "General").join(", ") || "_empty_"}. Load the trama-req-${el.area.id} skill for the full text.`;
  }
}

function refsBlock(project: ProjectModel, refs: string[]): string {
  return bullets(refs.map((r) => `- \`${r}\`\n${describeRef(project, r).split("\n").map((l) => `  > ${l}`).join("\n")}`), "_No references._");
}

/**
 * Requirements attached to the referenced Model elements or to what contains them, except those referenced
 * directly, plus a pointer to the Areas' General Requirements, which apply to everything.
 */
export function requirementsBlock(project: ProjectModel, refs: string[]): string {
  const explicit = new Set(refs.filter((r) => parseRequirementRef(r) !== null));
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const ref of refs) {
    if (parseRequirementRef(ref) !== null) continue;
    for (const r of requirementsFor(project, ref)) {
      const key = `requirements/${r.area.id}#${r.section.ref}`;
      if (seen.has(key) || explicit.has(key) || explicit.has(`requirements/${r.area.id}`)) continue;
      seen.add(key);
      lines.push(`- \`${key}\`\n${r.section.text.split("\n").map((l) => `  > ${l}`).join("\n")}`);
    }
  }
  const general = project.areas.filter((a) => a.sections.some((s) => s.ref === null && s.text !== "") || a.intro !== "");
  if (general.length > 0)
    lines.push(`- General Requirements apply too: ${general.map((a) => `${a.title} (skill \`trama-req-${a.id}\`)`).join(", ")}.`);
  return bullets(lines, "_No Requirements apply._");
}

const hasRequirements = (project: ProjectModel) => project.areas.some(hasContent);

export function taskShowView(p: Project, task: Task): Result {
  const project = loadProject(p);
  const md = [
    `${task.body.trim()}`,
    "",
    `Column: **${task.data.column}**${task.data.technical ? " · technical" : ""}${task.data.drift ? ` · from Drift ${task.data.drift}` : ""}`,
    "",
    "## References",
    task.data.refs.length === 0 ? "_Technical Task: no references._" : refsBlock(project, task.data.refs),
    ...(hasRequirements(project) ? ["", "## Requirements", requirementsBlock(project, task.data.refs)] : []),
  ].join("\n");
  return { md, json: { ...taskSummary(task), body: task.body } };
}

export function taskListView(p: Project, column?: string): Result {
  const tasks = listTasks(p).filter((t) => !column || t.data.column === column);
  const md = COLUMNS.filter((c) => !column || c === column)
    .map((c) => `## ${c}\n${bullets(tasks.filter((t) => t.data.column === c).map((t) => `- ${t.id} ${t.title}${t.data.technical ? " (technical)" : ""}`))}`)
    .join("\n\n");
  return { md: `# Tasks\n\n${md}`, json: { tasks: tasks.map(taskSummary) } };
}

export function driftShowView(p: Project, drift: Drift): Result {
  const project = loadProject(p);
  const md = [
    drift.body.trim(),
    "",
    `Status: **${drift.data.status}**${drift.data.resolution ? ` (${drift.data.resolution})` : ""}`,
    drift.data.proposal ? `Attached Proposal: ${drift.data.proposal}` : "",
    drift.data.task ? `Task: ${drift.data.task}` : "",
    "",
    "## References",
    refsBlock(project, drift.data.refs),
    ...(hasRequirements(project) ? ["", "## Requirements", requirementsBlock(project, drift.data.refs)] : []),
  ].join("\n");
  return { md, json: { ...driftSummary(drift), body: drift.body } };
}

export function driftListView(p: Project, all: boolean): Result {
  const drifts = listDrifts(p).filter((d) => all || d.data.status === "open");
  const md = bullets(
    drifts.map((d) => `- ${d.id} [${d.data.status}] ${d.title}${d.data.proposal ? ` (Proposal ${d.data.proposal})` : ""}`),
    "_No Drifts._",
  );
  return { md: `# Drifts\n\n${md}`, json: { drifts: drifts.map(driftSummary) } };
}

export function boardView(p: Project): Result {
  const proposals = listProposals(p).filter((x) => x.data.status === "open").map((x) => proposalSummary(p, x));
  const drifts = listDrifts(p).filter((d) => d.data.status === "open");
  const tasks = listTasks(p);
  const column = (c: string) => tasks.filter((t) => t.data.column === c);
  const line = (t: Task) => `- ${t.id} ${t.title}${t.data.technical ? " (technical)" : ""}`;
  const md = [
    "# Board",
    "",
    "## To decide",
    bullets([
      ...proposals.map((i) => `- Proposal ${i.id}${i.stale ? " (stale)" : ""}: ${i.title}`),
      ...drifts.map((d) => `- Drift ${d.id}: ${d.title}${d.data.proposal ? ` (Proposal ${d.data.proposal})` : ""}`),
    ]),
    "",
    "## To do",
    bullets(column("todo").map(line)),
    "",
    "## In progress",
    bullets(column("doing").map(line)),
    "",
    "## Done",
    bullets(column("done").map(line)),
  ].join("\n");
  return {
    md,
    json: {
      toDecide: { proposals, drifts: drifts.map(driftSummary) },
      todo: column("todo").map(taskSummary),
      doing: column("doing").map(taskSummary),
      done: column("done").map(taskSummary),
    },
  };
}
