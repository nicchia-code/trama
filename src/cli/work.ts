import { changes, health, listProposals, type Proposal, validateProposal } from "../core/proposals";
import { resolveRef } from "../core/refs";
import type { Project } from "../core/store";
import { loadModel } from "../core/store";
import type { Model } from "../core/types";
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
    "## Model validation with the Proposal applied",
    errors.length === 0 ? "Valid." : errors.map((d) => `- ${formatDiagnostic(d)}`).join("\n"),
  ].join("\n");
  return {
    md,
    json: { id: proposal.id, title: proposal.title, status: proposal.data.status, stale: h.stale, unbased: h.unbased, changes: fileChanges, errors },
  };
}

const taskSummary = (t: Task) => ({ id: t.id, title: t.title, column: t.data.column, technical: t.data.technical, refs: t.data.refs, drift: t.data.drift });
const driftSummary = (d: Drift) => ({ id: d.id, title: d.title, status: d.data.status, resolution: d.data.resolution, refs: d.data.refs, proposal: d.data.proposal, task: d.data.task });

/** The current Model text of an element, for inlining into a Task or Drift. */
export function describeRef(model: Model, ref: string): string {
  let el;
  try {
    el = resolveRef(model, ref);
  } catch {
    return `_\`${ref}\` no longer resolves in the Model._`;
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
  }
}

function refsBlock(model: Model, refs: string[]): string {
  return bullets(refs.map((r) => `- \`${r}\`\n${describeRef(model, r).split("\n").map((l) => `  > ${l}`).join("\n")}`), "_No references._");
}

export function taskShowView(p: Project, task: Task): Result {
  const model = loadModel(p);
  const md = [
    `${task.body.trim()}`,
    "",
    `Column: **${task.data.column}**${task.data.technical ? " · technical" : ""}${task.data.drift ? ` · from Drift ${task.data.drift}` : ""}`,
    "",
    "## Model references",
    task.data.technical ? "_Technical Task: no references._" : refsBlock(model, task.data.refs),
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
  const model = loadModel(p);
  const md = [
    drift.body.trim(),
    "",
    `Status: **${drift.data.status}**${drift.data.resolution ? ` (${drift.data.resolution})` : ""}`,
    drift.data.proposal ? `Attached Proposal: ${drift.data.proposal}` : "",
    drift.data.task ? `Task: ${drift.data.task}` : "",
    "",
    "## Model references",
    refsBlock(model, drift.data.refs),
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
