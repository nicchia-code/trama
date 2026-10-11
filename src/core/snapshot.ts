import type { CardNumbers } from "./card-names";
import { type Announcement, type AnnouncementKind, type CheckPhase, listAnnouncements } from "./announcements";
import type { FileChange } from "./diff";
import { type Change, type MergedMachine, mergeMachine } from "./merge";
import { applied, type ApprovalBlock, approvalBlock, baseFiles, changes, health, listProposals, type Proposal, type ProposalKind, unfixableDrifts } from "./proposals";
import { appliesUnder, type RequiredProposal } from "./required";
import { type ResolvedDrift, resolvedDrifts } from "./resolution";
import { type Area, areaIdOf, buildProject, type Fragment, parseRequirementRef, type ProjectModel } from "./requirements";
import { type Project, readTrackedFiles } from "./store";
import type { Actor, Diagnostic, Feature, Machine } from "./types";
import { type Blocker, computeBlocked } from "./blocking";
import { syncShortNumbers } from "./short-numbers";
import { readLastScan } from "./last-scan";
import { attachedDrift, type Column, type DriftOption, type DriftSides, driftOptions, driftSides, listDrifts, listTasks } from "./work";

export interface ActorChange {
  id: string;
  change: "added" | "removed" | "modified";
  events: { name: string; change: Change }[];
}

/** A section of an Area as shown, with what a Proposal does to it. */
export interface SectionView {
  /** `null` for the General section. */
  ref: string | null;
  text: string;
  change: Change;
  /** The text before the Proposal, when it changed or was removed. */
  before: string | null;
  /** The fragment the Proposal moves the section from; null when it stays where it was (or is new). */
  movedFrom: string | null;
}

/** A fragment of an Area as shown: its sections, General first, with what a Proposal does to them. */
export interface FragmentView {
  id: string;
  /** Path relative to `.trama/`, for opening the file. */
  file: string;
  title: string;
  description: string;
  change: "added" | "removed" | "modified" | "same";
  sections: SectionView[];
}

/** An Area of Requirements; outside Proposals every change is `same`. */
export interface AreaView {
  id: string;
  /** Path of the Area's `area.md` relative to `.trama/`, for opening the file. */
  file: string;
  title: string;
  description: string;
  intro: string;
  change: "added" | "removed" | "modified" | "same";
  /** By fragment name. A section a Proposal moves is shown only in the fragment it moves to. */
  fragments: FragmentView[];
}

/** The Model and Requirements as the Diagram and the Requirements tab draw them. */
export interface ModelView {
  system: { name: string; description: string };
  actors: Actor[];
  features: Feature[];
  machines: Machine[];
  areas: AreaView[];
}

/** An open Proposal with everything the Diagram needs to draw it as a ghost over the current Model. */
export interface ProposalView {
  id: string;
  title: string;
  body: string;
  kind: ProposalKind;
  /** Marked for automatic resolution under the developer's delegation; the marker grants no approval. */
  automatic: boolean;
  /** The Drifts a resolution resolves, in creation order, each with what approving does to it; empty for any other Proposal. */
  resolves: ResolvedDrift[];
  /** Required Proposals not approved yet; Approve stays disabled while any is listed. */
  requires: RequiredProposal[];
  /**
   * The Model with the open required Proposals applied, which this Proposal is drawn over; null when it requires
   * none and is drawn over the current Model.
   */
  base: ModelView | null;
  /** Touched files whose version changed since the Proposal recorded it. */
  stale: string[];
  unbased: string[];
  /** Validation errors of the Model and its Requirements with the Proposal applied. */
  errors: Diagnostic[];
  /** Why a resolution cannot be approved: each open Drift to be fixed in code that no longer has a Model element; empty otherwise. */
  unfixable: string[];
  /** What this Proposal itself changes, on top of the ones it requires. */
  changes: FileChange[];
  /** Every Machine the Proposal touches, before and after drawn as one. */
  machines: MergedMachine[];
  actors: ActorChange[];
  /** Every Area the Proposal touches, before and after drawn as one. */
  areas: AreaView[];
}

export interface DriftView {
  id: string;
  title: string;
  /** True only when a developer decision is urgently needed. */
  critical: boolean;
  body: string;
  sides: DriftSides | null;
  options: DriftOption[];
  option: number | null;
  note: string | null;
  requirementsOnly: boolean;
  refs: string[];
  proposal: string | null;
  proposalBlock: ApprovalBlock | null;
  proposalTitle: string | null;
  proposalChanges: FileChange[] | null;
}

export interface TaskView {
  id: string;
  title: string;
  body: string;
  column: Column;
  technical: boolean;
  refs: string[];
  drift: string | null;
  /** ID of the Proposal (the design) the Task comes from, if any. */
  proposal: string | null;
  /** Title of that Proposal, for the card that groups its Tasks; null when the Task has none or the Proposal is gone. */
  proposalTitle: string | null;
  /** True while the agent has taken the Task: the developer cannot move it. */
  agent: boolean;
  /** When the Task arrived in Done, UTC ISO 8601; null outside Done and on Tasks that reached Done before the instant was kept. */
  finished: string | null;
  /** Why the Task is blocked, if it is: the open Drifts, or the Task that fixes the code of its Drift. Empty when it is free. */
  blockedBy: Blocker[];
  /** Path relative to `.trama/`, for opening the file. */
  file: string;
}

/** A card the agent is about to create, drawn as a ghost in the column it will land in, or a check drawn in In progress. */
export interface AnnouncementView {
  id: string;
  kind: AnnouncementKind;
  /** The Draft's own title once a Draft is bound to it, the announced title before. */
  title: string;
  /** A card: Preparing until a Draft exists, Writing once it does. A check: its own phase. */
  phase: "preparing" | "writing" | CheckPhase;
}

export interface Snapshot extends ModelView {
  diagnostics: Diagnostic[];
  /** Open Proposals that await a decision: those attached to an open Drift are left out, decided through the Drift. */
  proposals: ProposalView[];
  drifts: DriftView[];
  tasks: TaskView[];
  /** Done Tasks finished after this working copy's remembered global Scan launch. */
  tasksSinceScan: number;
  /** The announcements that still exist, in the order they were announced. */
  announcements: AnnouncementView[];
  /** The short numbers of this working copy's live cards: the panel writes `T3` where a card is live and its identity where it is closed. */
  numbers: CardNumbers;
}

function actorChange(id: string, before: Actor | undefined, after: Actor | undefined): ActorChange {
  const was = new Map((before?.events ?? []).map((e) => [e.name, e]));
  const is = new Map((after?.events ?? []).map((e) => [e.name, e]));
  const events: ActorChange["events"] = [];
  for (const e of after?.events ?? []) {
    const o = was.get(e.name);
    events.push({ name: e.name, change: !o ? "added" : o.description !== e.description ? "changed" : "same" });
  }
  for (const e of before?.events ?? []) if (!is.has(e.name)) events.push({ name: e.name, change: "removed" });
  return { id, change: !before ? "added" : !after ? "removed" : "modified", events };
}

const sectionKey = (ref: string | null) => (ref === null ? "" : ref.toLowerCase());

/**
 * One Area drawn with what a change does to it; at least one side exists. Sections are matched by reference across
 * the whole Area: one that changes fragment is shown only in its new fragment, with the fragment it comes from.
 */
function areaView(shown: Area, before: Area | undefined, after: Area | undefined): AreaView {
  const fragmentOf = new Map([...(before?.fragments ?? []), ...(after?.fragments ?? [])].map((f) => [f.file, f.id]));
  const was = new Map((before?.sections ?? []).map((s) => [sectionKey(s.ref), s]));
  const is = new Set((after?.sections ?? []).map((s) => sectionKey(s.ref)));
  const sections = new Map<string, SectionView[]>();
  const add = (fragment: string, view: SectionView) => sections.set(fragment, [...(sections.get(fragment) ?? []), view]);
  for (const s of after?.sections ?? []) {
    const o = was.get(sectionKey(s.ref));
    const change: Change = !o ? "added" : o.text !== s.text ? "changed" : "same";
    const from = o ? (fragmentOf.get(o.file) as string) : null;
    const here = fragmentOf.get(s.file) as string;
    add(here, { ref: s.ref, text: s.text, change, before: change === "changed" && o ? o.text : null, movedFrom: from !== null && from !== here ? from : null });
  }
  for (const s of before?.sections ?? [])
    if (!is.has(sectionKey(s.ref))) add(fragmentOf.get(s.file) as string, { ref: s.ref, text: s.text, change: "removed", before: s.text, movedFrom: null });
  const oldFragments = new Map((before?.fragments ?? []).map((f) => [f.id, f]));
  const newFragments = new Map((after?.fragments ?? []).map((f) => [f.id, f]));
  const fragments = [...new Set([...oldFragments.keys(), ...newFragments.keys()])].sort().map((id): FragmentView => {
    const o = oldFragments.get(id);
    const n = newFragments.get(id);
    const f = (n ?? o) as Fragment;
    const views = (sections.get(id) ?? []).sort((a, b) => Number(a.ref !== null) - Number(b.ref !== null));
    const change = !o ? "added" : !n ? "removed" : before === after ? "same" : "modified";
    return { id, file: f.file, title: f.title, description: f.description, change, sections: views };
  });
  return {
    id: shown.id,
    file: shown.file,
    title: shown.title,
    description: shown.description,
    intro: shown.intro,
    change: !before ? "added" : !after ? "removed" : before === after ? "same" : "modified",
    fragments,
  };
}

const modelView = (project: ProjectModel): ModelView => ({
  system: { name: project.model.system.name, description: project.model.system.description },
  actors: [...project.model.actors.values()],
  features: [...project.model.features.values()],
  machines: [...project.model.machines.values()],
  areas: project.areas.map((a) => areaView(a, a, a)),
});

/** A Proposal as the Diagram and the Requirements tab draw it, read in `p` whose Model is `project`. */
function proposalView(p: Project, project: ProjectModel, proposal: Proposal): ProposalView {
  const afterProject = buildProject(applied(p, proposal));
  const after = afterProject.model;
  const h = health(p, proposal);
  const pending = h.requires.some((r) => appliesUnder(r.status));
  const baseProject = pending ? buildProject(baseFiles(p, proposal)) : project;
  const before = baseProject.model;
  const touched = changes(p, proposal);
  const machineIds = new Set<string>();
  const actorIds = new Set<string>();
  const areaIds = new Set<string>();
  for (const c of touched) {
    const areaId = areaIdOf(c.path);
    if (areaId !== null) {
      areaIds.add(areaId);
      continue;
    }
    const parts = c.path.split("/");
    const id = (parts.at(-1) as string).replace(/\.md$/, "");
    if (parts.length === 2 && parts[0] === "actors") actorIds.add(id);
    else if (parts.length === 2 && id !== "feature") machineIds.add(id);
  }
  const areaOf = (pm: ProjectModel, id: string) => pm.areas.find((a) => a.id === id);
  return {
    id: proposal.id,
    title: proposal.title,
    body: stripTitle(proposal.body),
    kind: proposal.data.kind,
    automatic: proposal.data.automatic,
    resolves: proposal.data.kind === "resolution" ? resolvedDrifts(p, proposal) : [],
    requires: h.requires,
    base: pending ? modelView(baseProject) : null,
    stale: h.stale,
    unbased: h.unbased,
    errors: afterProject.diagnostics,
    unfixable: unfixableDrifts(p, proposal),
    changes: touched,
    // A file the Model rejects (bad name, ID taken by a Feature or Actor) is a Machine on neither side; its errors are listed instead.
    machines: [...machineIds].sort().flatMap((id) => {
      const was = before.machines.get(id);
      const is = after.machines.get(id);
      return was || is ? [mergeMachine(was, is)] : [];
    }),
    actors: [...actorIds].sort().map((id) => actorChange(id, before.actors.get(id), after.actors.get(id))),
    areas: [...areaIds].sort().flatMap((id) => {
      const was = areaOf(baseProject, id);
      const is = areaOf(afterProject, id);
      const shown = is ?? was;
      return shown ? [areaView(shown, was, is)] : [];
    }),
  };
}

/** Everything the extension shows, as plain JSON. Malformed Task or Drift files throw, naming the file. */
export function buildSnapshot(p: Project): Snapshot {
  const numbers = syncShortNumbers(p).all();
  const project = buildProject(readTrackedFiles(p));

  const tasks = listTasks(p);
  const scanInstant = Date.parse(readLastScan(p));
  const tasksSinceScan = tasks.filter((t) => t.data.column === "done" && t.data.finished !== null && Date.parse(t.data.finished) > scanInstant).length;
  const drifts = listDrifts(p);
  const blocked = computeBlocked(project, tasks, drifts);

  const allProposals = listProposals(p);
  const openProposals = allProposals.filter((x) => x.data.status === "open").map((proposal) => proposalView(p, project, proposal));
  const proposalById = new Map(allProposals.map((x) => [x.id, x]));
  // The developer does not see attached Proposals, so the ghost of a Proposal whose Draft is attached to an open Drift is drawn nowhere.
  const announcements = listAnnouncements(p).filter((a) => !(a.kind === "proposal" && a.proposal !== null && attachedDrift(p, a.proposal)));
  return {
    ...modelView(project),
    diagnostics: project.diagnostics,
    proposals: openProposals.filter((v) => !attachedDrift(p, v.id)),
    drifts: drifts.filter((d) => d.data.status === "open").map((d) => ({
      id: d.id,
      title: d.title,
      critical: d.data.critical,
      body: stripTitle(d.body),
      sides: driftSides(d),
      options: driftOptions(d),
      option: d.data.option,
      note: d.data.note,
      requirementsOnly: d.data.refs.every((r) => parseRequirementRef(r) !== null),
      refs: d.data.refs,
      proposal: d.data.proposal,
      proposalBlock: d.data.proposal === null ? null : approvalBlock(p, d.data.proposal),
      proposalTitle: (d.data.proposal !== null && proposalById.get(d.data.proposal)?.title) || null,
      proposalChanges: openProposals.find((x) => x.id === d.data.proposal)?.changes ?? null,
    })),
    tasksSinceScan,
    tasks: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      body: stripTitle(t.body),
      column: t.data.column,
      technical: t.data.technical,
      refs: t.data.refs,
      drift: t.data.drift,
      proposal: t.data.proposal,
      proposalTitle: (t.data.proposal !== null && proposalById.get(t.data.proposal)?.title) || null,
      agent: t.data.agent,
      finished: t.data.finished,
      blockedBy: blocked.get(t.id) ?? [],
      file: `tasks/${t.name}`,
    })),
    announcements: announcements.map((a) => announcementView(a, a.proposal === null ? undefined : proposalById.get(a.proposal)?.title)),
    numbers,
  };
}

/** An announcement as the Board draws it; `proposalTitle` is the title of the Draft bound to it, if any. Only a Proposal's ghost takes its Draft's title: a Drift keeps its own. */
export function announcementView(a: Announcement, proposalTitle: string | undefined): AnnouncementView {
  return { id: a.id, kind: a.kind, title: (a.kind === "proposal" && a.proposal !== null && proposalTitle) || a.title, phase: a.phase ?? (a.proposal === null ? "preparing" : "writing") };
}

/** The title is shown separately, so the body drops its leading H1. */
const stripTitle = (body: string): string => body.replace(/^\s*#\s+.+\n+/, "").trim();
