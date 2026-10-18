import { approvalBlock, changes, coversScope, getProposal, health, listProposals, proposalCoverage, type Proposal, resolutionHolding, unfixableDrifts, validateProposal } from "../core/proposals";
import { decisionText } from "../core/resolution";
import { requiredReasons } from "../core/required";
import { hasContent, loadProject, parseRequirementRef, type Area, type ProjectModel, requirementsFor, resolveProjectRef } from "../core/requirements";
import { requirementSkillNames } from "../core/requirement-skills";
import { SPEC_FIELDS, type SpecEntry, type SpecField } from "../core/specs";
import type { Project } from "../core/store";
import { type ShortNumbers, syncShortNumbers } from "../core/short-numbers";
import { formatDiagnostic } from "../core/model";
import { type Blocker, concernSameThing } from "../core/blocking";
import { TramaError, UsageError } from "../core/errors";
import { attachedDrift, BATCH_DEFAULT, blockedTasks, closedUnchanged, COLUMNS, type Drift, driftCandidates, driftOptions, driftSides, freedTasks, type FreedTask, getTask, listDrifts, listTasks, nextTask, type ProposalFilter, type Task } from "../core/work";
import { machineReceiverLines, outgoingLines, reactionLines, stateTreeLines } from "./explore";
import { bullets, dash, eventKey, marker, prose, type Result } from "./result";
import type { AgentOrigin } from "../core/announcements";
import { recordTiming } from "../core/timings";

/** One-line summary of a Proposal for lists and the board. `number` is its short number (`P3`) while it is live, otherwise null. */
export function proposalSummary(p: Project, proposal: Proposal, numbers: ShortNumbers) {
  const h = proposal.data.status === "draft" || proposal.data.status === "open" ? health(p, proposal) : { stale: [], unbased: [], requires: [] };
  return { id: proposal.id, number: numbers.label("proposal", proposal.id), title: proposal.title, status: proposal.data.status, kind: proposal.data.kind, automatic: proposal.data.automatic, nonBlocking: proposal.data.nonBlocking, stale: h.stale.length > 0, requires: h.requires.map((r) => r.id), attachedTo: attachedDrift(p, proposal.id)?.id ?? null, resolves: proposal.data.kind === "resolution" ? proposal.data.drifts.length : null };
}

const resolvesMark = (i: { resolves: number | null; nonBlocking: boolean }) => (i.resolves === null ? "" : ` (resolves ${i.resolves} Drift${i.resolves === 1 ? "" : "s"})${i.nonBlocking ? " (blocks nothing)" : ""}`);

export function proposalListView(p: Project, all: boolean): Result {
  const numbers = syncShortNumbers(p);
  const items = listProposals(p)
    .filter((x) => all || x.data.status === "draft" || x.data.status === "open")
    .map((x) => proposalSummary(p, x, numbers));
  const flags = (i: (typeof items)[number]) =>
    [i.status, i.kind === "change" ? "" : i.kind, i.automatic ? "automatic" : "", i.stale ? "stale" : "", i.requires.length > 0 ? `requires ${i.requires.map((r) => numbers.name("proposal", r)).join(", ")}` : ""].filter(Boolean).join(", ");
  const md = bullets(
    items.map((i) => `- ${numbers.name("proposal", i.id)} [${flags(i)}] ${i.title}${i.status === "draft" ? " (draft)" : ""}${resolvesMark(i)}${i.attachedTo ? ` (attached to ${numbers.name("drift", i.attachedTo)})` : ""}`),
    "_No Proposals._",
  );
  return { md: `# Proposals\n\n${md}`, json: { proposals: items } };
}

/** The Drifts a resolution lists, in creation order, each with the decision approving it applies; a Drift resolved another way says so. */
function resolvedDriftsOf(p: Project, proposal: Proposal) {
  return listDrifts(p).flatMap((drift) => {
    const d = proposal.data.drifts.find((x) => x.drift === drift.id);
    if (!d) return [];
    const already = drift.data.status === "resolved" && drift.data.resolvedBy !== proposal.id;
    const option = d.option === undefined ? undefined : driftOptions(drift)[d.option - 1]?.title;
    const decision = already ? "(already resolved)" : decisionText(d.decision, option);
    return [{ ...d, title: drift.title, decision, already, ...(already ? { note: undefined } : {}) }];
  });
}

export function proposalShowView(p: Project, proposal: Proposal): Result {
  const numbers = syncShortNumbers(p);
  const live = proposal.data.status === "draft" || proposal.data.status === "open";
  const attached = attachedDrift(p, proposal.id);
  const resolvedDrifts = proposal.data.kind === "resolution" ? resolvedDriftsOf(p, proposal) : [];
  const h = live ? health(p, proposal) : { stale: [], unbased: [], requires: [] };
  // Only an ordinary Proposal not attached to a Drift brings Tasks, so only it has removals and scope: computed now while it is live; once approved, only the scope it saved before is history.
  const coverage = live && coversScope(proposal.data.kind) && attached === null ? proposalCoverage(p, proposal) : null;
  const history = live ? null : proposal.data.scanScope ?? null;
  const fileChanges = changes(p, proposal);
  const errors = live ? [...validateProposal(p, proposal), ...unfixableDrifts(p, proposal).map((message) => ({ file: "proposal.md", line: 0, message }))] : [];
  const md = [
    // The label goes under the title, the first line of the body.
    proposal.data.label ? proposal.body.trim().replace(/^#.*$/m, (title) => `${title}\n\nLabel: ${proposal.data.label}`) : proposal.body.trim(),
    "",
    `Status: **${proposal.data.status}**${h.stale.length > 0 ? " (stale)" : ""}${proposal.data.kind === "change" ? "" : ` · ${proposal.data.kind}`}${proposal.data.automatic ? " · automatic" : ""}`,
    attached ? `Attached to Drift ${numbers.name("drift", attached.id)} ${attached.title}. It brings no Tasks and is decided on the Drift.` : "",
    proposal.data.status === "draft" ? "Still being written; submit when finished. The developer cannot approve or reject it yet." : "",
    proposal.data.requires.length > 0 ? `Requires: ${proposal.data.requires.map((r) => numbers.name("proposal", r)).join(", ")}. Changes and validation below are on top of them.` : "",
    h.requires.length > 0 ? `\nCannot be approved yet:\n${requiredReasons(h.requires, (id) => numbers.name("proposal", id)).map((r) => `- ${r}`).join("\n")}` : "",
    h.stale.length > 0 ? `\nStale: the Model changed since the Proposal touched ${h.stale.join(", ")}. It cannot be approved; write a new Proposal.` : "",
    h.unbased.length > 0 ? `\nFiles never registered with \`trama proposal edit\`: ${h.unbased.join(", ")}` : "",
    "",
    "## Changes",
    bullets(
      fileChanges.map((c) => {
        const where = c.requirement ? ` · Area \`${c.requirement.area}\`, ${c.requirement.fragment === null ? "area.md" : `fragment \`${c.requirement.fragment}\``}` : "";
        return [`- \`${c.path}\` (${c.change})${where}`, ...c.details.map((d) => `  - ${d}`)].join("\n");
      }),
      "_No files touched._",
    ),
    "",
    ...(proposal.tasks.length === 0 ? [] : ["## Tasks", bullets(proposal.tasks.map((t) => `- \`${t.id}\` ${t.title}${t.technical ? " (technical)" : ""}${t.refs.length === 0 ? "" : ` · ${t.refs.map((r) => `\`${r}\``).join(", ")}`}`)), ""]),
    ...(proposal.data.kind === "resolution" ? ["Resolves Drifts", bullets(resolvedDrifts.map((r) => `- ${numbers.name("drift", r.drift)} ${r.title}: ${r.decision}${r.note === undefined ? "" : ` · ${r.note}`}`), "_None yet._"), ""] : []),
    ...(coverage === null || coverage.removals.length === 0 ? [] : ["## Created on approval", bullets(coverage.removals.map((r) => `- Remove code of \`${r.ref}\`${r.coveredBy === null ? "" : ` → \`${r.coveredBy}\``}`)), ""]),
    ...(coverage === null ? [] : ["## Scope", bullets(coverage.scope.map((e) => `- \`${e.ref}\` (${e.reason}) — ${e.coveredBy}`), "_Nothing to scan._"), ""]),
    ...(history === null ? [] : ["## Scan scope", bullets(history.map((e) => `- \`${e.ref}\` (${e.reason})`), "_Nothing to scan._"), ""]),
    "## Validation of the Model and Requirements with the Proposal applied",
    !live ? "Not checked for a finished Proposal." : errors.length === 0 ? "Valid." : errors.map((d) => `- ${formatDiagnostic(d)}`).join("\n"),
  ].join("\n");
  return {
    md,
    json: {
      id: proposal.id,
      number: numbers.label("proposal", proposal.id),
      title: proposal.title,
      label: proposal.data.label,
      status: proposal.data.status,
      kind: proposal.data.kind,
      automatic: proposal.data.automatic,
      nonBlocking: proposal.data.nonBlocking,
      drifts: proposal.data.drifts,
      tasks: proposal.tasks.map((t) => ({ id: t.id, title: t.title, technical: t.technical, refs: t.refs })),
      ...(proposal.data.kind === "resolution" ? { resolvesDrifts: resolvedDrifts } : {}),
      requires: proposal.data.requires,
      blockedBy: h.requires,
      stale: h.stale,
      unbased: h.unbased,
      changes: fileChanges,
      errors,
      ...(coverage === null ? {} : { removals: coverage.removals, scope: coverage.scope }),
      ...(history === null ? {} : { scanScope: history }),
    },
  };
}

/** A Task as the views and the JSON output show it. */
export interface TaskSummary {
  id: string;
  /** The short number (`T3`) while the Task is live, otherwise null. */
  number: string | null;
  title: string;
  column: Task["data"]["column"];
  technical: boolean;
  refs: string[];
  drift: string | null;
  /** ID of the Proposal (the design) the Task comes from, if any. */
  proposal: string | null;
  /** True while the agent has taken the Task. */
  agent: boolean;
  /** The note of a fix Task closed without changes; null otherwise. */
  unchanged: string | null;
  /** Why the Task is blocked, if it is: the open Drifts, or the Task that fixes the code of its Drift. */
  blockedBy: Blocker[];
}

/** Appended to a Task's line in the textual views while the agent has taken it. */
const WORKING = " (agent working)";

/** Appended to a Task's line in the textual views when it was closed without changes. */
const NO_CHANGES = " (no changes)";

/** Appended to a Task's line in the textual views for each thing that blocks it. */
const blockedMarks = (blockers: Blocker[], numbers: ShortNumbers) =>
  blockers.map((b) => (b.kind === "drift" ? ` (blocked by Drift ${numbers.name("drift", b.drift)})` : ` (waiting for Task ${numbers.name("task", b.task)})`)).join("");

const taskSummary = (t: Task, blocked: Map<string, Blocker[]>, numbers: ShortNumbers): TaskSummary => ({ id: t.id, number: numbers.label("task", t.id), title: t.title, column: t.data.column, technical: t.data.technical, refs: t.data.refs, drift: t.data.drift, proposal: t.data.proposal, agent: t.data.agent, unchanged: t.data.unchanged, blockedBy: blocked.get(t.id) ?? [] });

/** The Task's text with, right after its title, the line that says it was closed without changes and its check note. */
function withCheckNote(task: Task): string {
  const lines = task.body.trim().split("\n");
  if (task.data.unchanged === null) return lines.join("\n");
  const title = Math.max(0, lines.findIndex((l) => l.startsWith("# ")));
  return [...lines.slice(0, title + 1), "", "Closed without changes.", "", "## Check note", "", task.data.unchanged, ...lines.slice(title + 1)].join("\n");
}

const driftSummary = (d: Drift, numbers: ShortNumbers, closed: { task: string; note: string | null } | null, freed: FreedTask[]) => ({ id: d.id, number: numbers.label("drift", d.id), title: d.title, status: d.data.status, resolution: d.data.resolution, critical: d.data.critical, refs: d.data.refs, proposal: d.data.proposal, task: d.data.task, origin: d.data.origin, previous: d.data.previous, closedUnchanged: closed, notBlocking: freed.map((f) => ({ task: f.task, number: numbers.label("task", f.task), title: f.title, reason: f.reason })) });

/** The current text of a Model element or Requirement, for inlining into a Task or Drift. */
export function describeRef(project: ProjectModel, ref: string, full = false): string {
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
      if (!full) return `${el.machine.name}${dash(el.machine.description)}\nUse \`trama machine ${el.machine.id}\` for the full State tree.`;
      return [
        `${el.machine.name} (machine \`${el.machine.id}\`, feature \`${el.machine.feature}\`)`,
        el.machine.description,
        "States:",
        bullets(stateTreeLines(el.machine.states)),
        "Events:",
        bullets(machineReceiverLines(project.model, el.machine)),
      ]
        .filter((part) => part !== "")
        .join("\n");
    case "state":
      return [
        `${el.state.name}${marker(el.state)}${dash(el.state.description)}`,
        ...(full ? outgoingLines(el.machine, el.state) : el.state.transitions.map((t) => `- \`${eventKey(t)}\` → ${t.target}${prose(t)}`)),
      ].join("\n");
    case "transition":
      return el.transitions.map((t) => `- ${el.state.name}: \`${eventKey(t)}\` → ${t.target}${prose(t)}`).join("\n");
    case "event":
      if (!full) return `${ref}${dash(el.event.description)}`;
      return [
        `\`${ref}\` (emitted by ${project.model.machines.has(el.owner.id) ? "Machine" : "Actor"} \`${el.owner.id}\`)${dash(el.event.description)}`,
        "Transitions that react to it:",
        bullets(reactionLines(project.model, el.owner.id, el.event.name)),
      ].join("\n");
    case "requirement": {
      if (el.section) return `${el.area.title}, ${el.section.ref ?? "General"}:\n${el.section.text || "_empty_"}`;
      if (full) return areaText(el.area);
      const skills = requirementSkillNames(project, el.area);
      const pointer = skills.length === 0 ? "" : ` Load ${skills.map((s) => `the ${s}`).join(", ")} skill${skills.length > 1 ? "s" : ""} for the full text.`;
      return `${el.area.title}: ${el.area.sections.filter((s) => s.text !== "").map((s) => s.ref ?? "General").join(", ") || "_empty_"}.${pointer}`;
    }
    case "specs": {
      const entry = (e: SpecEntry) => `${e.name}${e.version ? ` ${e.version}` : ""}${e.chosenByAgent ? " (chosen by agent)" : ""}`;
      const fields: readonly SpecField[] = el.field === null ? SPEC_FIELDS : [el.field];
      return fields.map((f) => (f === "notes" ? `Notes: ${project.specs.notes || "_empty_"}` : `${f}: ${project.specs.lists[f].map(entry).join("; ") || "_empty_"}`)).join("\n");
    }
  }
}

/** Title, introduction and every section of an Area, so a Task can be carried out without opening the Area's skill. */
function areaText(area: Area): string {
  const sections = area.sections.map((s) => `## ${s.ref ?? "General"}\n${s.text || "_empty_"}`);
  return [area.title, area.description, area.intro, ...sections].filter((part) => part !== "").join("\n\n");
}

function refsBlock(project: ProjectModel, refs: string[], full = false): string {
  return bullets(refs.map((r) => `- \`${r}\`\n${describeRef(project, r, full).split("\n").map((l) => `  > ${l}`).join("\n")}`), "_No references._");
}

const quoteBlock = (key: string, text: string) => `- \`${key}\`\n${text.split("\n").map((l) => `  > ${l}`).join("\n")}`;

/**
 * Requirements attached to the referenced Model elements or to what contains them, except those referenced
 * directly, plus a pointer to the Areas' General Requirements, which apply to everything.
 */
export function requirementsBlock(project: ProjectModel, refs: string[], general: "pointer" | "text" | "none" = "pointer"): string {
  const explicit = new Set(refs.filter((r) => parseRequirementRef(r) !== null));
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const ref of refs) {
    if (parseRequirementRef(ref) !== null) continue;
    for (const r of requirementsFor(project, ref)) {
      const key = `requirements/${r.area.id}#${r.section.ref}`;
      if (seen.has(key) || explicit.has(key) || explicit.has(`requirements/${r.area.id}`)) continue;
      seen.add(key);
      lines.push(quoteBlock(key, r.section.text));
    }
  }
  if (general === "text") {
    for (const area of project.areas) {
      const section = area.sections.find((s) => s.ref === null && s.text !== "");
      const key = `requirements/${area.id}#General`;
      if (!section || explicit.has(key)) continue;
      lines.push(quoteBlock(key, section.text));
    }
  } else if (general === "pointer") {
    const areas = project.areas.filter((a) => a.sections.some((s) => s.ref === null && s.text !== "") || a.intro !== "");
    const named = (a: Area) => {
      const general = a.sections.find((s) => s.ref === null && s.text !== "") ?? null;
      const skills = requirementSkillNames(project, a, general).concat(general ? [] : requirementSkillNames(project, a));
      return skills.length === 0 ? a.title : `${a.title} (skill${skills.length > 1 ? "s" : ""} ${skills.map((s) => `\`${s}\``).join(", ")})`;
    };
    if (areas.length > 0) lines.push(`- General Requirements apply too: ${areas.map(named).join(", ")}.`);
  }
  return bullets(lines, "_No Requirements apply._");
}

const hasRequirements = (project: ProjectModel) => project.areas.some(hasContent);

export function taskShowView(p: Project, task: Task): Result {
  const project = loadProject(p);
  const numbers = syncShortNumbers(p);
  const blocked = blockedTasks(p);
  const blockedBy = blocked.get(task.id) ?? [];
  const md = [
    `${withCheckNote(task)}`,
    "",
    `Column: **${task.data.column}**${task.data.technical ? " · technical" : ""}${task.data.drift ? ` · from Drift ${numbers.name("drift", task.data.drift)}` : ""}${task.data.proposal ? ` · from Proposal ${numbers.name("proposal", task.data.proposal)}` : ""}${task.data.agent ? WORKING : ""}${blockedMarks(blockedBy, numbers)}`,
    ...blockedBy.map((b) => (b.kind === "drift" ? `Blocked by Drift ${numbers.name("drift", b.drift)}: ${b.title}` : `Waiting for Task ${numbers.name("task", b.task)}: ${b.title} (fixes the code for Drift ${numbers.name("drift", b.drift)})`)),
    "",
    "## References",
    task.data.refs.length === 0 ? "_Technical Task: no references._" : refsBlock(project, task.data.refs, true),
    ...(hasRequirements(project) ? ["", "## Requirements", requirementsBlock(project, task.data.refs, "text")] : []),
  ].join("\n");
  return { md, json: { ...taskSummary(task, blocked, numbers), body: task.body } };
}

/** A Task's line in the textual lists: its marks, and what blocks it. */
const taskLine = (t: Task, blocked: Map<string, Blocker[]>, numbers: ShortNumbers) =>
  `- ${numbers.name("task", t.id)} ${t.title}${t.data.technical ? " (technical)" : ""}${t.data.proposal ? ` (Proposal ${numbers.name("proposal", t.data.proposal)})` : ""}${t.data.agent ? WORKING : ""}${t.data.unchanged !== null ? NO_CHANGES : ""}${blockedMarks(blocked.get(t.id) ?? [], numbers)}`;

export function taskListView(p: Project, column?: string): Result {
  const blocked = blockedTasks(p);
  const numbers = syncShortNumbers(p);
  const tasks = listTasks(p).filter((t) => !column || t.data.column === column);
  const md = COLUMNS.filter((c) => !column || c === column)
    .map((c) => `## ${c}\n${bullets(tasks.filter((t) => t.data.column === c).map((t) => taskLine(t, blocked, numbers)))}`)
    .join("\n\n");
  return { md: `# Tasks\n\n${md}`, json: { tasks: tasks.map((t) => taskSummary(t, blocked, numbers)) } };
}

/** The Proposals a `task next` answer is about, as its line names them: `in Proposal P3`, `outside Proposals P1, P2`, or nothing. */
function proposalScope(p: Project, numbers: ShortNumbers, filter: ProposalFilter): string {
  const named = (ids: string[]) => ids.map((id) => numbers.name("proposal", getProposal(p, id).id)).join(", ");
  if (filter.include?.length) return ` in Proposal${filter.include.length === 1 ? "" : "s"} ${named(filter.include)}`;
  if (filter.exclude?.length) return ` outside Proposal${filter.exclude.length === 1 ? "" : "s"} ${named(filter.exclude)}`;
  return "";
}

/**
 * The next runnable Task, or with `batch` the group of a parallel run, one Task per line; or the statement that
 * there is none with the Tasks in To do that wait, the same either way. Moves nothing.
 */
export function taskNextView(p: Project, filter: ProposalFilter = {}, batch = false, max?: number, taskIds?: string[], timing?: { origin: AgentOrigin; job?: string }): Result {
  const queue = nextTask(p, filter, max, taskIds);
  if (batch && timing) recordTiming(p, timing.origin, { event: "queue", requested: max ?? BATCH_DEFAULT, given: queue.batch.length, remaining: queue.remaining }, { job: timing.job });
  const { next, waiting } = queue;
  const blocked = new Map(waiting.map((w) => [w.task.id, w.blockers]));
  const numbers = syncShortNumbers(p);
  const scope = proposalScope(p, numbers, filter);
  const waitingJson = waiting.map((w) => taskSummary(w.task, blocked, numbers));
  const brief = (t: Task) => ({ id: t.id, number: numbers.label("task", t.id), title: t.title });
  if (next && batch) return { md: queue.batch.map((t) => `${numbers.name("task", t.id)} ${t.title}`).join("\n"), json: { batch: queue.batch.map(brief), waiting: waitingJson } };
  if (next) return { md: `Next Task${scope}: ${numbers.name("task", next.id)} ${next.title}`, json: { next: brief(next), waiting: waitingJson } };
  const md = [`No Task is runnable${scope}.`, ...(waiting.length > 0 ? ["", "Still in To do:", ...waiting.map((w) => taskLine(w.task, blocked, numbers))] : [])].join("\n");
  return { md, json: { next: null, waiting: waitingJson } };
}

export function driftShowView(p: Project, drift: Drift): Result {
  const project = loadProject(p);
  const numbers = syncShortNumbers(p);
  const sides = driftSides(drift);
  const closed = closedUnchanged(p, drift);
  const freed = freedTasks(drift, listTasks(p));
  const bodyText = drift.body.replace(/^#\s+.+\n+/, "").trim();
  const options = driftOptions(drift);
  const numbered = options.flatMap((o, i) => ["", `${i + 1}. **${o.title}**${i === 0 ? " (recommended)" : ""}`, "", ...o.text.split("\n").map((l) => (l ? `   ${l}` : l))]);
  const chosen = drift.data.option === null ? undefined : options[drift.data.option - 1];
  const description = sides
    ? [
        "## What happens", "", sides.happens, "", "## What should happen", "", sides.should,
        ...(options.length > 0 ? ["", "## Fix options", ...numbered] : []),
        ...(sides.where ? ["", "## Where in the code", "", sides.where] : []),
      ]
    : ["## Description", "", bodyText];
  const decision = [
    ...(drift.data.option !== null ? ["", "## Chosen option", "", `${drift.data.option}${chosen ? `. ${chosen.title}` : ""}`] : []),
    ...(drift.data.note ? ["", "## Note", "", drift.data.note] : []),
    ...(closed ? ["", "## Check note", "", closed.note ?? "The Task left Done; its note is gone."] : []),
  ];
  const attached = drift.data.proposal;
  let attachedLine = "";
  let block: { kind: string; reason: string } | null = null;
  if (attached) {
    let status = "missing";
    try {
      status = getProposal(p, attached).data.status;
    } catch {
      // a missing Proposal is reported by approvalBlock below
    }
    block = drift.data.status === "open" ? approvalBlock(p, attached) : null;
    attachedLine = `Attached Proposal: ${numbers.name("proposal", attached)} (${status})${block ? `\nCannot be approved: ${block.reason}` : ""}`;
  }
  // The link is computed from the Proposals, never written in the Drift: a resolution still being written or open that lists it.
  const holding = drift.data.status === "open" ? resolutionHolding(p, drift.id) : null;
  const resolutionLine = holding
    ? `In resolution Proposal ${numbers.name("proposal", holding.id)} ${holding.title}`
    : drift.data.resolvedBy ? `Resolved by Proposal ${numbers.name("proposal", drift.data.resolvedBy)}` : "";
  const resolutionJson = { inResolutionProposal: holding ? { id: holding.id, number: numbers.label("proposal", holding.id), title: holding.title } : null, resolvedBy: drift.data.resolvedBy };
  // A recurring Drift names the Drift it follows. A resolved Drift has no short number, so it is named by its identity.
  const previous = drift.data.previous;
  const followed = previous === null ? undefined : listDrifts(p).find((d) => d.id === previous);
  const followsLine = previous === null ? "" : `Follows Drift ${numbers.name("drift", previous)}${followed ? ` ${followed.title} (${followed.data.resolution})` : ""}`;
  const md = [
    `# ${drift.title}${drift.data.critical ? " [CRITICAL: urgent developer decision]" : ""}`,
    ...(closed ? [`Dismissed by Task ${numbers.name("task", closed.task)} without changes`] : []),
    "",
    ...(previous === null ? [] : [followsLine, ""]),
    ...description,
    ...(freed.length === 0 ? [] : ["", "## Not blocking", "", ...freed.map((f) => `- ${numbers.name("task", f.task)} ${f.title ?? "(no longer exists)"}: ${f.reason}`)]),
    ...decision,
    "",
    `Status: **${drift.data.status}**${drift.data.resolution ? ` (${drift.data.resolution})` : ""}`,
    attachedLine,
    resolutionLine,
    drift.data.task ? `Task: ${numbers.name("task", drift.data.task)}` : "",
    "",
    "## References",
    refsBlock(project, drift.data.refs),
    ...(hasRequirements(project) ? ["", "## Requirements", requirementsBlock(project, drift.data.refs)] : []),
  ].join("\n");
  return { md, json: { ...driftSummary(drift, numbers, closed, freed), body: drift.body, happens: sides?.happens ?? null, should: sides?.should ?? null, where: sides?.where ?? null, options, option: drift.data.option, note: drift.data.note, proposalBlock: block, ...resolutionJson } };
}

export function driftListView(p: Project, all: boolean, refs: string[] = []): Result {
  const numbers = syncShortNumbers(p);
  const model = loadProject(p);
  // A reference that does not resolve is a usage error, not an empty list.
  for (const ref of refs) {
    try {
      resolveProjectRef(model, ref);
    } catch (error) {
      throw new UsageError(error instanceof Error ? error.message : `Cannot resolve "${ref}"`);
    }
  }
  // The same test that decides which Tasks a Drift blocks: the same element, or one inside the other.
  const drifts = listDrifts(p).filter((d) => (all || d.data.status === "open") && (refs.length === 0 || concernSameThing(model, d.data.refs, refs)));
  const tasks = listTasks(p);
  const md = bullets(
    drifts.map((d) => `- ${numbers.name("drift", d.id)} [${d.data.status}]${d.data.critical ? " [CRITICAL: urgent developer decision]" : ""} ${d.title}${d.data.previous === null ? "" : " (recurring)"}${closedUnchanged(p, d, tasks) ? " (dismissed, no changes)" : ""}${d.data.proposal ? ` (Proposal ${numbers.name("proposal", d.data.proposal)})` : ""}`),
    "_No Drifts._",
  );
  return { md: `# Drifts\n\n${md}`, json: { drifts: drifts.map((d) => driftSummary(d, numbers, closedUnchanged(p, d, tasks), freedTasks(d, tasks))) } };
}

/** The Tasks a new Drift with these references and this origin would block, by number or identity and title; writes nothing. */
export function driftCandidatesView(p: Project, refs: string[], originArg: string | undefined): Result {
  if (refs.length === 0) throw new UsageError("Name at least one reference with --ref");
  const numbers = syncShortNumbers(p);
  let candidates: Task[];
  try {
    candidates = driftCandidates(p, refs, originArg === undefined ? null : getTask(p, originArg, true).id);
  } catch (error) {
    if (error instanceof TramaError) throw new UsageError(error.message);
    throw error;
  }
  const md = candidates.length === 0 ? "No Task would be blocked by a Drift with these references and origin." : candidates.map((t) => `- ${numbers.name("task", t.id)} ${t.title}`).join("\n");
  return { md, json: { tasks: candidates.map((t) => ({ id: t.id, number: numbers.label("task", t.id), title: t.title })) } };
}

/**
 * The Board as text. Like the Board in the editor, the Tasks of one design stand together: each design once, in the
 * column its Tasks add up to, with its Tasks underneath, each with its own column. `task list` stays flat.
 */
export function boardView(p: Project): Result {
  const numbers = syncShortNumbers(p);
  const allProposals = listProposals(p);
  const summaries = allProposals.map((x) => proposalSummary(p, x, numbers)).filter((x) => !x.attachedTo);
  const proposals = summaries.filter((x) => x.status === "open");
  const drafts = summaries.filter((x) => x.status === "draft");
  const open = listDrifts(p).filter((d) => d.data.status === "open");
  // The open Drifts an open resolution lists are shown inside its row, not as rows of their own.
  const inResolution = new Set(allProposals.filter((x) => x.data.kind === "resolution" && x.data.status === "open").flatMap((x) => x.data.drifts.map((d) => d.drift)));
  const allTasks = listTasks(p);
  const drifts = open.filter((d) => !inResolution.has(d.id)).map((d) => driftSummary(d, numbers, null, freedTasks(d, allTasks)));
  const openById = new Map(open.map((d) => [d.id, d]));
  // A Proposal attached to an open Drift stays under that Drift's line, also when a resolution lists the Drift.
  const attachedLine = (proposalId: string | null, indent: string) => {
    const att = proposalId ? allProposals.find((x) => x.id === proposalId) : undefined;
    return att ? `\n${indent}- Proposal ${numbers.label("proposal", att.id) ?? att.id}${att.data.status === "draft" ? " (draft)" : ""}: ${att.title}` : "";
  };
  const nestedDrifts = (id: string) => {
    const proposal = allProposals.find((x) => x.id === id);
    if (proposal?.data.kind !== "resolution") return "";
    return resolvedDriftsOf(p, proposal)
      .filter((r) => openById.has(r.drift))
      .map((r) => `\n  - Drift ${numbers.name("drift", r.drift)}: ${r.title} · ${r.decision}${attachedLine(openById.get(r.drift)?.data.proposal ?? null, "    ")}`)
      .join("");
  };
  const blocked = blockedTasks(p);
  const tasks = listTasks(p).map((task) => taskSummary(task, blocked, numbers));
  const line = (t: TaskSummary) => `${t.number ?? t.id} ${t.title}${t.technical ? " (technical)" : ""}${t.agent ? WORKING : ""}${t.unchanged !== null ? NO_CHANGES : ""}${blockedMarks(t.blockedBy, numbers)}`;
  // A design of two or more Tasks is one group, in the column its Tasks add up to; every other Task stays a line of its own.
  const designs = new Map<string, TaskSummary[]>();
  for (const t of tasks) if (t.proposal !== null) designs.set(t.proposal, [...(designs.get(t.proposal) ?? []), t]);
  const columnName = { todo: "To do", doing: "In progress", done: "Done" } as const;
  const designLines = (proposalId: string, ts: TaskSummary[]) => {
    const title = allProposals.find((x) => x.id === proposalId)?.title;
    return [`- Proposal ${numbers.name("proposal", proposalId)}${title ? `: ${title}` : ""}`, ...ts.map((t) => `  - [${columnName[t.column]}] ${line(t)}`)].join("\n");
  };
  const entries = (column: string): string[] => {
    const seen = new Set<string>();
    return tasks.flatMap((t) => {
      const design = t.proposal === null ? undefined : designs.get(t.proposal);
      if (t.proposal === null || design === undefined || design.length < 2) return t.column === column ? [`- ${line(t)}`] : [];
      if (seen.has(t.proposal)) return [];
      seen.add(t.proposal);
      const derived = design.every((t) => t.column === "todo") ? "todo" : design.every((t) => t.column === "done") ? "done" : "doing";
      return derived === column ? [designLines(t.proposal, design)] : [];
    });
  };
  const flat = (column: string) => tasks.filter((x) => x.column === column).map((x) => ({ kind: "task" as const, ...x }));
  const md = [
    "# Board",
    "",
    ...(drafts.length === 0 ? [] : ["## In writing", bullets(drafts.map((i) => `- Proposal ${i.number ?? i.id} (draft): ${i.title}${resolvesMark(i)}`)), ""]),
    "## To decide",
    bullets([
      ...proposals.map((i) => `- Proposal ${i.number ?? i.id}${i.stale ? " (stale)" : ""}: ${i.title}${resolvesMark(i)}${nestedDrifts(i.id)}`),
      ...drifts.map((d) => {
        const nested = attachedLine(d.proposal, "  ");
        return `- Drift ${d.number ?? d.id}${d.critical ? " [CRITICAL: urgent developer decision]" : ""}: ${d.title}${d.previous === null ? "" : " (recurring)"}${nested || (d.proposal ? ` (Proposal ${numbers.name("proposal", d.proposal)})` : "")}`;
      }),
    ]),
    "",
    "## To do",
    bullets(entries("todo")),
    "",
    "## In progress",
    bullets(entries("doing")),
    "",
    "## Done",
    bullets(entries("done")),
  ].join("\n");
  return {
    md,
    json: {
      inWriting: drafts,
      toDecide: { proposals, drifts },
      todo: flat("todo"),
      doing: flat("doing"),
      done: flat("done"),
    },
  };
}
