import { approvalBlock, changes, coversScope, getProposal, health, listProposals, proposalCoverage, type Proposal, resolutionHolding, unfixableDrifts, validateProposal } from "../core/proposals";
import { readTaskImages } from "../core/task-images";
import { decisionText } from "../core/resolution";
import { requiredReasons } from "../core/required";
import { bullets, describeRef, requirementsBlock } from "../core/describe";
import { hasContent, loadProject, type ProjectModel, resolveProjectRef } from "../core/requirements";
import type { Project } from "../core/store";
import { type ShortNumbers, syncShortNumbers } from "../core/short-numbers";
import { formatDiagnostic } from "../core/model";
import { type Blocker, concernSameThing } from "../core/blocking";
import { TramaError, UsageError } from "../core/errors";
import { attachedDrift, BATCH_DEFAULT, blockedTasks, closedUnchanged, COLUMNS, type Drift, driftBody, driftCandidates, driftOptions, driftSides, getTask, listDrifts, listTasks, nextTask, type ProposalFilter, type Task, taskProgress, unifiedCandidates, withoutPrepared } from "../core/work";
import { type PreparedDecision, preparedFlag, type PreparedStatus, preparedStatus, preparedStatusText, unpreparedDrifts } from "../core/prepared";
import type { Result } from "./result";
import type { AgentOrigin } from "../core/announcements";
import { recordTiming } from "../core/timings";
import { parallelGroups } from "../core/groups";

/** One-line summary of a Proposal for lists and the board. `number` is its short number (`P3`) while it is live, otherwise null. */
export function proposalSummary(p: Project, proposal: Proposal, numbers: ShortNumbers) {
  const h = proposal.data.status === "draft" || proposal.data.status === "open" ? health(p, proposal) : { stale: [], unbased: [], requires: [] };
  return { id: proposal.id, number: numbers.label("proposal", proposal.id), title: proposal.title, status: proposal.data.status, kind: proposal.data.kind, prepared: proposal.data.prepared, stale: h.stale.length > 0, refining: proposal.data.refining, requires: h.requires.map((r) => r.id), attachedTo: attachedDrift(p, proposal.id)?.id ?? null, resolves: proposal.data.kind === "resolution" ? proposal.data.drifts.length : null };
}

const resolvesMark = (i: { resolves: number | null }) => (i.resolves === null ? "" : ` (resolves ${i.resolves} Drift${i.resolves === 1 ? "" : "s"})`);

export function proposalListView(p: Project, all: boolean): Result {
  const numbers = syncShortNumbers(p);
  const items = listProposals(p)
    .filter((x) => all || x.data.status === "draft" || x.data.status === "open")
    .map((x) => proposalSummary(p, x, numbers));
  const flags = (i: (typeof items)[number]) =>
    [i.status, i.kind === "change" ? "" : i.kind, i.stale ? "stale" : "", i.requires.length > 0 ? `requires ${i.requires.map((r) => numbers.name("proposal", r)).join(", ")}` : ""].filter(Boolean).join(", ");
  const md = bullets(
    items.map((i) => `- ${numbers.name("proposal", i.id)} [${flags(i)}] ${i.title}${i.status === "draft" ? " (draft)" : ""}${i.refining ? " (refining)" : ""}${resolvesMark(i)}${i.attachedTo ? ` (attached to ${numbers.name("drift", i.attachedTo)})` : ""}`),
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
  const redone = proposal.data.reworks;
  const reworked = redone === null ? "" : `${numbers.name("proposal", redone)} ${listProposals(p).find((x) => x.id === redone)?.title ?? ""}`.trim();
  const resolvedDrifts = proposal.data.kind === "resolution" ? resolvedDriftsOf(p, proposal) : [];
  const h = live ? health(p, proposal) : { stale: [], unbased: [], requires: [] };
  // Only an ordinary Proposal not attached to a Drift brings Tasks, so only it has removals and scope: computed now while it is live; once approved, only the scope it saved before is history.
  const coverage = live && coversScope(proposal.data.kind) && attached === null ? proposalCoverage(p, proposal) : null;
  const history = live ? null : proposal.data.scanScope ?? null;
  const fileChanges = changes(p, proposal);
  const errors = live ? [...validateProposal(p, proposal), ...unfixableDrifts(p, proposal).map((message) => ({ file: "proposal.md", line: 0, message }))] : [];
  const md = [
    // The label and the Reworks line go under the title, the first line of the body.
    proposal.data.label || reworked
      ? proposal.body.trim().replace(/^#.*$/m, (title) => [title, proposal.data.label ? `Label: ${proposal.data.label}` : "", reworked ? `Reworks: ${reworked}` : ""].filter(Boolean).join("\n\n"))
      : proposal.body.trim(),
    "",
    `Status: **${proposal.data.status}**${h.stale.length > 0 ? " (stale)" : ""}${proposal.data.kind === "change" ? "" : ` · ${proposal.data.kind}`}`,
    attached ? `Attached to Drift ${numbers.name("drift", attached.id)} ${attached.title}. It brings no Tasks and is decided on the Drift.` : "",
    proposal.data.status === "draft" ? "Still being written; submit when finished. The developer cannot approve or reject it yet." : "",
    proposal.data.refining ? "Refining: rebased, not handed over yet" : "",
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
      reworks: proposal.data.reworks,
      status: proposal.data.status,
      kind: proposal.data.kind,
      prepared: proposal.data.prepared,
      refining: proposal.data.refining,
      drifts: proposal.data.drifts,
      tasks: proposal.tasks.map((t) => ({ id: t.id, title: t.title, technical: t.technical, refs: t.refs, images: readTaskImages(p, t.id).map((i) => i.name) })),
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
  /** The percentage the agent declared for the Task it has taken; null when none. */
  progress: number | null;
  /** The note of a fix Task closed without changes; null otherwise. */
  unchanged: string | null;
  /** Why the Task is blocked, if it is: the open Drifts, or the Task that fixes the code of its Drift. */
  blockedBy: Blocker[];
}

/** Appended to a Task's line in the textual views while the agent has taken it, with the declared percentage when there is one. */
const working = (progress: number | null) => ` (agent working${progress === null ? "" : `, ${progress}%`})`;

/** Appended to a Task's line in the textual views when it was closed without changes. */
const NO_CHANGES = " (no changes)";

/** Appended to a Task's line in the textual views for each thing that blocks it. */
const blockedMarks = (blockers: Blocker[], numbers: ShortNumbers) =>
  blockers.map((b) => (b.kind === "drift" ? ` (blocked by Drift ${numbers.name("drift", b.drift)})` : ` (waiting for Task ${numbers.name("task", b.task)})`)).join("");

export const taskSummary = (p: Project, t: Task, blocked: Map<string, Blocker[]>, numbers: ShortNumbers): TaskSummary => ({ id: t.id, number: numbers.label("task", t.id), title: t.title, column: t.data.column, technical: t.data.technical, refs: t.data.refs, drift: t.data.drift, proposal: t.data.proposal, agent: t.data.agent, progress: taskProgress(p, t), unchanged: t.data.unchanged, blockedBy: blocked.get(t.id) ?? [] });

/** The Task's text with, right after its title, the line that says it was closed without changes and its check note. */
function withCheckNote(task: Task): string {
  const lines = task.body.trim().split("\n");
  if (task.data.unchanged === null) return lines.join("\n");
  const title = Math.max(0, lines.findIndex((l) => l.startsWith("# ")));
  return [...lines.slice(0, title + 1), "", "Closed without changes.", "", "## Check note", "", task.data.unchanged, ...lines.slice(title + 1)].join("\n");
}

const driftSummary = (d: Drift, numbers: ShortNumbers, closed: { task: string; note: string | null } | null) => ({ id: d.id, number: numbers.label("drift", d.id), title: d.title, status: d.data.status, resolution: d.data.resolution, refs: d.data.refs, proposal: d.data.proposal, task: d.data.task, origin: d.data.origin, previous: d.data.previous, unifies: d.data.unifies, unifiedInto: d.data.unifiedInto, job: d.data.job, closedUnchanged: closed });

function refsBlock(project: ProjectModel, refs: string[], full = false): string {
  return bullets(refs.map((r) => `- \`${r}\`\n${describeRef(project, r, full).split("\n").map((l) => `  > ${l}`).join("\n")}`), "_No references._");
}

const hasRequirements = (project: ProjectModel) => project.areas.some(hasContent);

export function taskShowView(p: Project, task: Task): Result {
  const project = loadProject(p);
  const numbers = syncShortNumbers(p);
  const blocked = blockedTasks(p);
  const blockedBy = blocked.get(task.id) ?? [];
  const images = readTaskImages(p, task.id);
  const md = [
    `${withCheckNote(task)}`,
    "",
    `Column: **${task.data.column}**${task.data.technical ? " · technical" : ""}${task.data.drift ? ` · from Drift ${numbers.name("drift", task.data.drift)}` : ""}${task.data.proposal ? ` · from Proposal ${numbers.name("proposal", task.data.proposal)}` : ""}${task.data.agent ? working(taskProgress(p, task)) : ""}${blockedMarks(blockedBy, numbers)}`,
    ...blockedBy.map((b) => (b.kind === "drift" ? `Blocked by Drift ${numbers.name("drift", b.drift)}: ${b.title}` : `Waiting for Task ${numbers.name("task", b.task)}: ${b.title} (fixes the code for Drift ${numbers.name("drift", b.drift)})`)),
    "",
    "## References",
    task.data.refs.length === 0 ? "_Technical Task: no references._" : refsBlock(project, task.data.refs, true),
    ...(images.length === 0 ? [] : ["", "## Images", ...images.map((i) => `- ${i.path}`)]),
    ...(hasRequirements(project) ? ["", "## Requirements", requirementsBlock(project, task.data.refs, "text")] : []),
  ].join("\n");
  return { md, json: { ...taskSummary(p, task, blocked, numbers), body: task.body, images: images.map((i) => i.path) } };
}

/** A Task's line in the textual lists: its marks, and what blocks it. */
const taskLine = (p: Project, t: Task, blocked: Map<string, Blocker[]>, numbers: ShortNumbers) =>
  `- ${numbers.name("task", t.id)} ${t.title}${t.data.technical ? " (technical)" : ""}${t.data.proposal ? ` (Proposal ${numbers.name("proposal", t.data.proposal)})` : ""}${t.data.agent ? working(taskProgress(p, t)) : ""}${t.data.unchanged !== null ? NO_CHANGES : ""}${blockedMarks(blocked.get(t.id) ?? [], numbers)}`;

/** The Tasks by column, flat, filtered by `column` and by the identities in `ids` when given. */
export function taskListView(p: Project, column?: string, ids?: ReadonlySet<string>): Result {
  const blocked = blockedTasks(p);
  const numbers = syncShortNumbers(p);
  const tasks = listTasks(p).filter((t) => (!column || t.data.column === column) && (ids === undefined || ids.has(t.id)));
  const md = COLUMNS.filter((c) => !column || c === column)
    .map((c) => `## ${c}\n${bullets(tasks.filter((t) => t.data.column === c).map((t) => taskLine(p, t, blocked, numbers)))}`)
    .join("\n\n");
  return { md: `# Tasks\n\n${md}`, json: { tasks: tasks.map((t) => taskSummary(p, t, blocked, numbers)) } };
}

/** The Proposals a `task list` answer with `runnable` is about, as its line names them: `in Proposal P3`, `outside Proposals P1, P2`, or nothing. */
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
export function taskNextView(p: Project, filter: ProposalFilter = {}, batch = false, max?: number, taskIds?: string[], timing?: { origin: AgentOrigin; job?: string }, withHeldBack = false): Result {
  const queue = nextTask(p, filter, max, taskIds);
  if (batch && timing) recordTiming(p, timing.origin, { event: "queue", requested: max ?? BATCH_DEFAULT, given: queue.batch.length, remaining: queue.remaining }, { job: timing.job });
  const { next, waiting } = queue;
  const blocked = new Map(waiting.map((w) => [w.task.id, w.blockers]));
  const numbers = syncShortNumbers(p);
  const scope = proposalScope(p, numbers, filter);
  const waitingJson = waiting.map((w) => taskSummary(p, w.task, blocked, numbers));
  const brief = (t: Task) => ({ id: t.id, number: numbers.label("task", t.id), title: t.title });
  const heldOut = heldBackOutput(numbers, queue.heldBack);
  const held = withHeldBack ? { md: `\n\n${heldOut.md}`, json: heldOut.json } : { md: "", json: {} };
  if (next && batch) return { md: queue.batch.map((t) => `${numbers.name("task", t.id)} ${t.title}`).join("\n") + held.md, json: { batch: queue.batch.map(brief), waiting: waitingJson, ...held.json } };
  if (next) return { md: `Next Task${scope}: ${numbers.name("task", next.id)} ${next.title}${held.md}`, json: { next: brief(next), waiting: waitingJson, ...held.json } };
  const md = [`No Task is runnable${scope}.`, ...(waiting.length > 0 ? ["", "Still in To do:", ...waiting.map((w) => taskLine(p, w.task, blocked, numbers))] : [])].join("\n");
  return { md: md + held.md, json: { next: null, waiting: waitingJson, ...held.json } };
}

/** The `## Held back` section of a run's answer, in markdown and in JSON: each runnable Task kept out and the Tasks it overlaps. */
function heldBackOutput(numbers: ShortNumbers, held: { task: Task; overlaps: Task[] }[]): { md: string; json: { heldBack: { id: string; number: string | null; title: string; overlaps: { id: string; number: string | null }[] }[] } } {
  const lines = held.map((h) => `- ${numbers.name("task", h.task.id)} ${h.task.title} (overlaps ${h.overlaps.map((o) => numbers.name("task", o.id)).join(", ")})`);
  return {
    md: `## Held back\n\n${lines.length === 0 ? "_None._" : lines.join("\n")}`,
    json: { heldBack: held.map((h) => ({ id: h.task.id, number: numbers.label("task", h.task.id), title: h.task.title, overlaps: h.overlaps.map((o) => ({ id: o.id, number: numbers.label("task", o.id) })) })) },
  };
}

/**
 * The runnable Tasks of a parallel run in groups: each `## Group <n>` lists its Tasks and what ties them, then the runnable
 * Tasks held back for a Task the agent has taken. With `max`, up to that many groups. Moves nothing.
 */
export function taskGroupsView(p: Project, filter: ProposalFilter = {}, max?: number, taskIds?: string[], timing?: { origin: AgentOrigin; job?: string }): Result {
  const queue = parallelGroups(p, filter, max, taskIds);
  const given = queue.groups.reduce((n, g) => n + g.tasks.length, 0);
  if (timing && max !== undefined) recordTiming(p, timing.origin, { event: "queue", requested: max, given, remaining: queue.remaining }, { job: timing.job });
  const numbers = syncShortNumbers(p);
  const scope = proposalScope(p, numbers, filter);
  const code = (refs: string[]) => refs.map((r) => `\`${r}\``).join(", ");
  const groups = queue.groups.map((g, i) => {
    const tasks = g.tasks.map((t) => `- ${numbers.name("task", t.id)} ${t.title}`);
    const shared = [...(g.refs.length > 0 ? [`refs ${code(g.refs)}`] : []), ...(g.files.length > 0 ? [`files ${code(g.files)}`] : [])];
    return `## Group ${i + 1}\n\n${tasks.join("\n")}\n\nShared: ${shared.join("; ") || "none"}`;
  });
  const held = heldBackOutput(numbers, queue.heldBack);
  const md = groups.length === 0 && queue.heldBack.length === 0 ? `No Task is runnable${scope}.` : [...groups, ...(queue.heldBack.length > 0 ? [held.md] : [])].join("\n\n");
  const json = {
    groups: queue.groups.map((g) => ({ tasks: g.tasks.map((t) => ({ id: t.id, number: numbers.label("task", t.id), title: t.title })), refs: g.refs, files: g.files })),
    ...held.json,
  };
  return { md, json };
}

/**
 * The "Prepared question" block of `drift show` and its JSON: the status, the question and each option with its decision, the recommended one marked.
 * No block without the section. An unreadable section shows only its status and counts as absent in the JSON.
 */
function preparedBlock(status: PreparedStatus | null, fixOptions: { title: string }[]): { md: string[]; json: { valid: boolean; question: unknown; decisions: unknown } | null } {
  if (status === null) return { md: [], json: null };
  if (status.state === "unreadable") return { md: ["", "## Prepared question", "", `Status: **${preparedStatusText(status)}**`], json: null };
  const { question, decisions } = status.value;
  const decided = (d: PreparedDecision) => (d.decision === "fix-code" ? `fix the code, option ${d.option}${fixOptions[d.option - 1] ? ` (${fixOptions[d.option - 1]?.title})` : ""}` : d.decision === "proposal" ? "accept the attached Proposal" : "close without changes");
  const options = question.options.flatMap((o, i) => ["", `${i + 1}. **${o.label}**${i === question.recommended ? " (recommended)" : ""} → ${decided(decisions[i] as PreparedDecision)}`, "", `   ${o.description}`]);
  const md = ["", "## Prepared question", "", `Status: **${preparedStatusText(status)}**`, "", question.question, ...(question.context === undefined ? [] : ["", question.context]), ...options];
  return { md, json: { valid: status.state === "valid", question, decisions } };
}

export function driftShowView(p: Project, drift: Drift): Result {
  const project = loadProject(p);
  const numbers = syncShortNumbers(p);
  const sides = driftSides(drift);
  const closed = closedUnchanged(p, drift);
  const tasks = listTasks(p);
  // A Task deleted with Clear is shown by its permanent identity and `no longer exists`.
  const taskName = (id: string): string => (tasks.some((t) => t.id === id) ? numbers.name("task", id) : `${id} (no longer exists)`);
  const bodyText = driftBody(drift);
  const status = preparedStatus(p, drift, project);
  const prepared = preparedBlock(status, driftOptions(drift));
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
    ...(closed ? ["", "## Check note", "", tasks.some((t) => t.id === closed.task) ? (closed.note ?? "The Task left Done; its note is gone.") : `Task ${closed.task} no longer exists.`] : []),
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
  // A recurring Drift names each Drift it follows. A resolved Drift has no short number, so it is named by its identity.
  const allDrifts = listDrifts(p);
  const followsLines = drift.data.previous.map((id) => {
    const followed = allDrifts.find((d) => d.id === id);
    return `Follows Drift ${numbers.name("drift", id)}${followed ? ` ${followed.title} (${followed.data.resolution})` : ""}`;
  });
  const intoDrift = drift.data.unifiedInto === null ? undefined : allDrifts.find((d) => d.id === drift.data.unifiedInto);
  const unifiedLine = drift.data.unifiedInto === null ? "" : `Unified into ${numbers.name("drift", drift.data.unifiedInto)}${intoDrift ? ` ${intoDrift.title}` : ""}`;
  const unifiesBlock = drift.data.unifies.length === 0 ? [] : ["", "## Unifies", "", ...drift.data.unifies.map((id) => `- ${id} ${allDrifts.find((d) => d.id === id)?.title ?? "(no longer exists)"}`)];
  const md = [
    `# ${drift.title}`,
    ...(unifiedLine === "" ? [] : [unifiedLine]),
    ...(closed ? [`Dismissed by Task ${taskName(closed.task)} without changes`] : []),
    "",
    ...(followsLines.length === 0 ? [] : [...followsLines, ""]),
    ...description,
    ...unifiesBlock,
    ...decision,
    "",
    `Status: **${drift.data.status}**${drift.data.resolution ? ` (${drift.data.resolution})` : ""}`,
    attachedLine,
    resolutionLine,
    drift.data.task ? `Task: ${taskName(drift.data.task)}` : "",
    ...prepared.md,
    "",
    "## References",
    refsBlock(project, drift.data.refs),
    ...(hasRequirements(project) ? ["", "## Requirements", requirementsBlock(project, drift.data.refs)] : []),
  ].join("\n");
  return { md, json: { ...driftSummary(drift, numbers, closed), prepared: prepared.json, preparedStatus: status === null ? null : preparedStatusText(status), body: withoutPrepared(drift.body).trim(), happens: sides?.happens ?? null, should: sides?.should ?? null, where: sides?.where ?? null, options, option: drift.data.option, note: drift.data.note, proposalBlock: block, ...resolutionJson } };
}

export function driftListView(p: Project, all: boolean, refs: string[] = [], filter: { job?: string; unprepared?: boolean } = {}): Result {
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
  const concerned = listDrifts(p).filter((d) => (all || d.data.status === "open") && (refs.length === 0 || concernSameThing(model, d.data.refs, refs)) && (filter.job === undefined || d.data.job === filter.job));
  const drifts = filter.unprepared === true ? unpreparedDrifts(p, concerned) : concerned;
  const tasks = listTasks(p);
  const md = bullets(
    drifts.map((d) => `- ${numbers.name("drift", d.id)} [${d.data.status}] ${d.title}${d.data.previous.length === 0 ? "" : " (recurring)"}${d.data.unifies.length === 0 ? "" : ` (unifies ${d.data.unifies.length})`}${d.data.unifiedInto === null ? "" : ` (unified into ${numbers.name("drift", d.data.unifiedInto)})`}${closedUnchanged(p, d, tasks) ? " (dismissed, no changes)" : ""}${d.data.proposal ? ` (Proposal ${numbers.name("proposal", d.data.proposal)})` : ""}`),
    "_No Drifts._",
  );
  return { md: `# Drifts\n\n${md}`, json: { drifts: drifts.map((d) => ({ ...driftSummary(d, numbers, closedUnchanged(p, d, tasks)), prepared: preparedFlag(preparedStatus(p, d, model)) })) } };
}

/** The Tasks a new Drift with these references and this origin would block, by number or identity and title; writes nothing. */
export function driftCandidatesView(p: Project, refs: string[], originArg: string | undefined, unifies?: string[]): Result {
  if (refs.length === 0) throw new UsageError("Name at least one reference in `refs`");
  const numbers = syncShortNumbers(p);
  let candidates: Task[];
  try {
    candidates =
      unifies === undefined
        ? driftCandidates(p, refs, originArg === undefined ? [] : [getTask(p, originArg, true).id])
        : unifiedCandidates(p, unifies, refs);
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
  const drifts = open.filter((d) => !inResolution.has(d.id)).map((d) => driftSummary(d, numbers, null));
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
  const tasks = listTasks(p).map((task) => taskSummary(p, task, blocked, numbers));
  const line = (t: TaskSummary) => `${t.number ?? t.id} ${t.title}${t.technical ? " (technical)" : ""}${t.agent ? working(t.progress) : ""}${t.unchanged !== null ? NO_CHANGES : ""}${blockedMarks(t.blockedBy, numbers)}`;
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
      ...proposals.map((i) => `- Proposal ${i.number ?? i.id}${i.stale ? " (stale)" : ""}${i.refining ? " (refining)" : ""}: ${i.title}${resolvesMark(i)}${nestedDrifts(i.id)}`),
      ...drifts.map((d) => {
        const nested = attachedLine(d.proposal, "  ");
        return `- Drift ${d.number ?? d.id}: ${d.title}${d.previous.length === 0 ? "" : " (recurring)"}${d.unifies.length === 0 ? "" : ` (unifies ${d.unifies.length})`}${nested || (d.proposal ? ` (Proposal ${numbers.name("proposal", d.proposal)})` : "")}`;
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
