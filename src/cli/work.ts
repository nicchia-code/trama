import { approvalBlock, changes, getProposal, health, listProposals, type Proposal, validateProposal } from "../core/proposals";
import { requiredReasons } from "../core/required";
import { hasContent, loadProject, parseRequirementRef, type Area, type ProjectModel, requirementsFor, resolveProjectRef } from "../core/requirements";
import { requirementSkillNames } from "../core/requirement-skills";
import type { Project } from "../core/store";
import { type ShortNumbers, syncShortNumbers } from "../core/short-numbers";
import { formatDiagnostic } from "../core/model";
import { placeTasks } from "../core/design";
import type { Blocker } from "../core/blocking";
import { blockedTasks, COLUMNS, type Drift, driftOptions, driftSides, listDrifts, listTasks, nextTask, type Task } from "../core/work";
import { machineReceiverLines, outgoingLines, reactionLines, stateTreeLines } from "./explore";
import { bullets, dash, eventKey, marker, prose, type Result } from "./result";

/** One-line summary of a Proposal for lists and the board. `number` is its short number (`P3`) while it is live, otherwise null. */
export function proposalSummary(p: Project, proposal: Proposal, numbers: ShortNumbers) {
  const h = proposal.data.status === "draft" || proposal.data.status === "open" ? health(p, proposal) : { stale: [], unbased: [], requires: [] };
  return { id: proposal.id, number: numbers.label("proposal", proposal.id), title: proposal.title, status: proposal.data.status, kind: proposal.data.kind, stale: h.stale.length > 0, requires: h.requires.map((r) => r.id) };
}

export function proposalListView(p: Project, all: boolean): Result {
  const numbers = syncShortNumbers(p);
  const items = listProposals(p)
    .filter((x) => all || x.data.status === "draft" || x.data.status === "open")
    .map((x) => proposalSummary(p, x, numbers));
  const flags = (i: (typeof items)[number]) =>
    [i.status, i.kind === "import" ? "import" : "", i.stale ? "stale" : "", i.requires.length > 0 ? `requires ${i.requires.map((r) => numbers.name("proposal", r)).join(", ")}` : ""].filter(Boolean).join(", ");
  const md = bullets(
    items.map((i) => `- ${numbers.name("proposal", i.id)} [${flags(i)}] ${i.title}${i.status === "draft" ? " (draft)" : ""}`),
    "_No Proposals._",
  );
  return { md: `# Proposals\n\n${md}`, json: { proposals: items } };
}

export function proposalShowView(p: Project, proposal: Proposal): Result {
  const numbers = syncShortNumbers(p);
  const live = proposal.data.status === "draft" || proposal.data.status === "open";
  const h = live ? health(p, proposal) : { stale: [], unbased: [], requires: [] };
  const fileChanges = changes(p, proposal);
  const errors = live ? validateProposal(p, proposal) : [];
  const md = [
    proposal.body.trim(),
    "",
    `Status: **${proposal.data.status}**${h.stale.length > 0 ? " (stale)" : ""}${proposal.data.kind === "import" ? " · import" : ""}`,
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
    ...(proposal.data.scanScope === null ? [] : ["## Scan scope", bullets(proposal.data.scanScope.map((e) => `- \`${e.ref}\` (${e.reason})`), "_Nothing to scan._"), ""]),
    "## Validation of the Model and Requirements with the Proposal applied",
    !live ? "Not checked for a finished Proposal." : errors.length === 0 ? "Valid." : errors.map((d) => `- ${formatDiagnostic(d)}`).join("\n"),
  ].join("\n");
  return {
    md,
    json: {
      id: proposal.id,
      number: numbers.label("proposal", proposal.id),
      title: proposal.title,
      status: proposal.data.status,
      kind: proposal.data.kind,
      requires: proposal.data.requires,
      blockedBy: h.requires,
      stale: h.stale,
      unbased: h.unbased,
      changes: fileChanges,
      errors,
      ...(proposal.data.scanScope === null ? {} : { scanScope: proposal.data.scanScope }),
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
  /** Why the Task is blocked, if it is: the open Drifts, or the Task that fixes the code of its Drift. */
  blockedBy: Blocker[];
}

/** Appended to a Task's line in the textual views while the agent has taken it. */
const WORKING = " (agent working)";

/** Appended to a Task's line in the textual views for each thing that blocks it. */
const blockedMarks = (blockers: Blocker[], numbers: ShortNumbers) =>
  blockers.map((b) => (b.kind === "drift" ? ` (blocked by Drift ${numbers.name("drift", b.drift)})` : ` (waiting for Task ${numbers.name("task", b.task)})`)).join("");

const taskSummary = (t: Task, blocked: Map<string, Blocker[]>, numbers: ShortNumbers): TaskSummary => ({ id: t.id, number: numbers.label("task", t.id), title: t.title, column: t.data.column, technical: t.data.technical, refs: t.data.refs, drift: t.data.drift, proposal: t.data.proposal, agent: t.data.agent, blockedBy: blocked.get(t.id) ?? [] });
const driftSummary = (d: Drift, numbers: ShortNumbers) => ({ id: d.id, number: numbers.label("drift", d.id), title: d.title, status: d.data.status, resolution: d.data.resolution, refs: d.data.refs, proposal: d.data.proposal, task: d.data.task, origin: d.data.origin });

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
      const skills = requirementSkillNames(project.areas, el.area);
      const pointer = skills.length === 0 ? "" : ` Load ${skills.map((s) => `the ${s}`).join(", ")} skill${skills.length > 1 ? "s" : ""} for the full text.`;
      return `${el.area.title}: ${el.area.sections.filter((s) => s.text !== "").map((s) => s.ref ?? "General").join(", ") || "_empty_"}.${pointer}`;
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
export function requirementsBlock(project: ProjectModel, refs: string[], general: "pointer" | "text" = "pointer"): string {
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
  } else {
    const areas = project.areas.filter((a) => a.sections.some((s) => s.ref === null && s.text !== "") || a.intro !== "");
    const named = (a: Area) => {
      const general = a.sections.find((s) => s.ref === null && s.text !== "") ?? null;
      const skills = requirementSkillNames(project.areas, a, general).concat(general ? [] : requirementSkillNames(project.areas, a));
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
    `${task.body.trim()}`,
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
  `- ${numbers.name("task", t.id)} ${t.title}${t.data.technical ? " (technical)" : ""}${t.data.proposal ? ` (Proposal ${numbers.name("proposal", t.data.proposal)})` : ""}${t.data.agent ? WORKING : ""}${blockedMarks(blocked.get(t.id) ?? [], numbers)}`;

export function taskListView(p: Project, column?: string): Result {
  const blocked = blockedTasks(p);
  const numbers = syncShortNumbers(p);
  const tasks = listTasks(p).filter((t) => !column || t.data.column === column);
  const md = COLUMNS.filter((c) => !column || c === column)
    .map((c) => `## ${c}\n${bullets(tasks.filter((t) => t.data.column === c).map((t) => taskLine(t, blocked, numbers)))}`)
    .join("\n\n");
  return { md: `# Tasks\n\n${md}`, json: { tasks: tasks.map((t) => taskSummary(t, blocked, numbers)) } };
}

/**
 * The next runnable Task, or with `batch` the group of a parallel run, one Task per line; or the statement that
 * there is none with the Tasks in To do that wait, the same either way. Moves nothing.
 */
export function taskNextView(p: Project, proposal?: string, batch = false): Result {
  const queue = nextTask(p, proposal);
  const { next, waiting } = queue;
  const blocked = new Map(waiting.map((w) => [w.task.id, w.blockers]));
  const numbers = syncShortNumbers(p);
  const scope = proposal === undefined ? "" : ` in Proposal ${numbers.name("proposal", getProposal(p, proposal).id)}`;
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
  const md = [
    `# ${drift.title}`,
    "",
    ...description,
    ...decision,
    "",
    `Status: **${drift.data.status}**${drift.data.resolution ? ` (${drift.data.resolution})` : ""}`,
    attachedLine,
    drift.data.task ? `Task: ${numbers.name("task", drift.data.task)}` : "",
    "",
    "## References",
    refsBlock(project, drift.data.refs),
    ...(hasRequirements(project) ? ["", "## Requirements", requirementsBlock(project, drift.data.refs)] : []),
  ].join("\n");
  return { md, json: { ...driftSummary(drift, numbers), body: drift.body, happens: sides?.happens ?? null, should: sides?.should ?? null, where: sides?.where ?? null, options, option: drift.data.option, note: drift.data.note, proposalBlock: block } };
}

export function driftListView(p: Project, all: boolean): Result {
  const numbers = syncShortNumbers(p);
  const drifts = listDrifts(p).filter((d) => all || d.data.status === "open");
  const md = bullets(
    drifts.map((d) => `- ${numbers.name("drift", d.id)} [${d.data.status}] ${d.title}${d.data.proposal ? ` (Proposal ${numbers.name("proposal", d.data.proposal)})` : ""}`),
    "_No Drifts._",
  );
  return { md: `# Drifts\n\n${md}`, json: { drifts: drifts.map((d) => driftSummary(d, numbers)) } };
}

/**
 * The Board as text. Like the Board in the editor, the Tasks of one design stand together: each design once, in the
 * column its Tasks add up to, with its Tasks underneath, each with its own column. `task list` stays flat.
 */
export function boardView(p: Project): Result {
  const numbers = syncShortNumbers(p);
  const allProposals = listProposals(p);
  const proposals = allProposals.filter((x) => x.data.status === "open").map((x) => proposalSummary(p, x, numbers));
  const drafts = allProposals.filter((x) => x.data.status === "draft").map((x) => proposalSummary(p, x, numbers));
  const titles = new Map(allProposals.map((x) => [x.id, x.title]));
  const drifts = listDrifts(p).filter((d) => d.data.status === "open").map((d) => driftSummary(d, numbers));
  const blocked = blockedTasks(p);
  const placed = placeTasks(listTasks(p).map((task) => taskSummary(task, blocked, numbers)));
  const line = (t: TaskSummary) => `${t.number ?? t.id} ${t.title}${t.technical ? " (technical)" : ""}${t.agent ? WORKING : ""}${blockedMarks(t.blockedBy, numbers)}`;
  const entries = (column: string) =>
    placed
      .filter((x) => x.column === column)
      .map((x) => {
        if (!x.design) return { md: `- ${line(x.task)}`, json: { kind: "task" as const, ...x.task } };
        const done = x.tasks.filter((t) => t.column === "done").length;
        const title = titles.get(x.proposal) ?? `Proposal ${numbers.name("proposal", x.proposal)}`;
        return {
          md: [`- Proposal ${numbers.name("proposal", x.proposal)} "${title}" (${done}/${x.tasks.length} done)`, ...x.tasks.map((t) => `  - ${line(t)} [${t.column}]`)].join("\n"),
          json: { kind: "design" as const, proposal: x.proposal, number: numbers.label("proposal", x.proposal), title, done, total: x.tasks.length, tasks: x.tasks },
        };
      });
  const md = [
    "# Board",
    "",
    ...(drafts.length === 0 ? [] : ["## In writing", bullets(drafts.map((i) => `- Proposal ${i.number ?? i.id} (draft): ${i.title}`)), ""]),
    "## To decide",
    bullets([
      ...proposals.map((i) => `- Proposal ${i.number ?? i.id}${i.stale ? " (stale)" : ""}: ${i.title}`),
      ...drifts.map((d) => `- Drift ${d.number ?? d.id}: ${d.title}${d.proposal ? ` (Proposal ${numbers.name("proposal", d.proposal)})` : ""}`),
    ]),
    "",
    "## To do",
    bullets(entries("todo").map((e) => e.md)),
    "",
    "## In progress",
    bullets(entries("doing").map((e) => e.md)),
    "",
    "## Done",
    bullets(entries("done").map((e) => e.md)),
  ].join("\n");
  return {
    md,
    json: {
      inWriting: drafts,
      toDecide: { proposals, drifts },
      todo: entries("todo").map((e) => e.json),
      doing: entries("doing").map((e) => e.json),
      done: entries("done").map((e) => e.json),
    },
  };
}
