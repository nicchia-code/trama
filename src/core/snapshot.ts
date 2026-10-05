import { type Announcement, type AnnouncementKind, listAnnouncements } from "./announcements";
import type { FileChange } from "./diff";
import { type Change, type MergedMachine, mergeMachine } from "./merge";
import { applied, type ApprovalBlock, approvalBlock, baseFiles, changes, health, listProposals, type ProposalKind } from "./proposals";
import { inWorktreeProposals, type InWorktreeProposal, openProposalsAwaitingDecision, roundWorktrees } from "./worktree-round";
import { mergeDriftDocument } from "./worktree-merge";
import { appliesUnder, type RequiredProposal } from "./required";
import { type Area, buildProject, parseRequirementRef, type ProjectModel } from "./requirements";
import { multiBranchOn, readMultiBranch } from "./multi-branch";
import { byCreation, type Project, readTrackedFiles, REQUIREMENTS_PREFIX } from "./store";
import type { Actor, Diagnostic, Feature, Machine } from "./types";
import { type Blocker, computeBlocked } from "./blocking";
import { type Column, type Drift, type DriftOption, type DriftSides, driftOptions, driftSides, listDrifts, listTasks, type Task } from "./work";

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
}

/** An Area of Requirements; outside Proposals every change is `same`. */
export interface AreaView {
  id: string;
  /** Path relative to `.trama/`, for opening the file. */
  file: string;
  title: string;
  description: string;
  intro: string;
  change: "added" | "removed" | "modified" | "same";
  sections: SectionView[];
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
  /** The Drift's text after the title, for a Drift written before the two sides existed. */
  body: string;
  /** What the code does, what the Model or Requirement says and where in the code it was seen; null for a Drift written before the two sections existed. */
  sides: DriftSides | null;
  /** The fix options in their written order, the first being the recommended one; empty for a Drift written before options existed. */
  options: DriftOption[];
  /** Number, from 1, of the option chosen when the code was fixed; null while Open and in Drifts without options. */
  option: number | null;
  /** The developer's note kept with the choice; null when there is none. */
  note: string | null;
  /** True when the Drift points only to Requirements: the "should" side is then what the Requirements say. */
  requirementsOnly: boolean;
  refs: string[];
  /** ID of the attached Proposal, if any. */
  proposal: string | null;
  /** Why the attached Proposal cannot be approved now (draft, rejected, discarded, stale, waiting, invalid…), or null when it can or there is none. */
  proposalBlock: ApprovalBlock | null;
  /** Proposal whose worktree this Drift lives in, or null when it lives in the open folder. */
  worktree: string | null;
  /** The round's Merge Drift: it lives in the merge worktree and is drawn with the round's own choices. */
  merge?: boolean;
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
  /** Why the Task is blocked, if it is: the open Drifts, or the Task that fixes the code of its Drift. Empty when it is free. */
  blockedBy: Blocker[];
  /** Path relative to `.trama/`, for opening the file. */
  file: string;
  /** Proposal whose worktree this Task lives in, or null when it lives in the open folder. */
  worktree: string | null;
}

/** A card the agent is about to create, drawn as a ghost in the column it will land in. */
export interface AnnouncementView {
  id: string;
  kind: AnnouncementKind;
  /** The Draft's own title once a Draft is bound to it, the announced title before. */
  title: string;
  /** Preparing until a Draft exists, Writing once it does. */
  phase: "preparing" | "writing";
}

export interface Snapshot extends ModelView {
  diagnostics: Diagnostic[];
  /** Open Proposals that still await a decision. A Proposal in a worktree is not among them. */
  proposals: ProposalView[];
  /** Proposals that have a worktree. They are a group of their own, not awaiting a decision. */
  inWorktree: InWorktreeProposal[];
  drifts: DriftView[];
  tasks: TaskView[];
  /** The announcements that still exist, in the order they were announced. */
  announcements: AnnouncementView[];
  /** This working copy's multi-branch switch. On only when its file reads as `on`. */
  multiBranch: boolean;
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

/** One Area drawn with what a change does to it; at least one side exists. */
function areaView(shown: Area, before: Area | undefined, after: Area | undefined): AreaView {
  const was = new Map((before?.sections ?? []).map((s) => [sectionKey(s.ref), s]));
  const is = new Set((after?.sections ?? []).map((s) => sectionKey(s.ref)));
  const sections: SectionView[] = [];
  for (const s of after?.sections ?? []) {
    const o = was.get(sectionKey(s.ref));
    const change: Change = !o ? "added" : o.text !== s.text ? "changed" : "same";
    sections.push({ ref: s.ref, text: s.text, change, before: change === "changed" && o ? o.text : null });
  }
  for (const s of before?.sections ?? [])
    if (!is.has(sectionKey(s.ref))) sections.push({ ref: s.ref, text: s.text, change: "removed", before: s.text });
  return {
    id: shown.id,
    file: shown.file,
    title: shown.title,
    description: shown.description,
    intro: shown.intro,
    change: !before ? "added" : !after ? "removed" : before === after ? "same" : "modified",
    sections,
  };
}

const modelView = (project: ProjectModel): ModelView => ({
  system: { name: project.model.system.name, description: project.model.system.description },
  actors: [...project.model.actors.values()],
  features: [...project.model.features.values()],
  machines: [...project.model.machines.values()],
  areas: project.areas.map((a) => areaView(a, a, a)),
});

/** Everything the extension shows, as plain JSON. Malformed Task or Drift files throw, naming the file. */
export function buildSnapshot(p: Project): Snapshot {
  const project = buildProject(readTrackedFiles(p));

  const tasks = listTasks(p);
  const blocked = computeBlocked(project, tasks, listDrifts(p));

  const allProposals = listProposals(p);
  const proposals = openProposalsAwaitingDecision(p, allProposals).map((proposal): ProposalView => {
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
        if (c.path.startsWith(REQUIREMENTS_PREFIX)) {
          areaIds.add(c.path.slice(REQUIREMENTS_PREFIX.length).replace(/\.md$/, ""));
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
        requires: h.requires,
        base: pending ? modelView(baseProject) : null,
        stale: h.stale,
        unbased: h.unbased,
        errors: afterProject.diagnostics,
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
    });
  const proposalById = new Map(allProposals.map((x) => [x.id, x]));
  const folders = roundWorktrees(p);
  const viewDrift = (home: Project, d: Drift, worktree: string | null): DriftView => ({
    id: d.id,
    title: d.title,
    body: stripTitle(d.body),
    sides: driftSides(d),
    options: driftOptions(d),
    option: d.data.option,
    note: d.data.note,
    requirementsOnly: d.data.refs.every((r) => parseRequirementRef(r) !== null),
    refs: d.data.refs,
    proposal: d.data.proposal,
    proposalBlock: d.data.proposal === null ? null : approvalBlock(home, d.data.proposal),
    worktree,
  });
  const viewTask = (t: Task, why: Map<string, Blocker[]>, worktree: string | null): TaskView => ({
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
    blockedBy: why.get(t.id) ?? [],
    file: `tasks/${t.name}`,
    worktree,
  });
  const openDrifts = listDrifts(p).filter((d) => d.data.status === "open").map((drift) => ({ drift, home: p, worktree: null as string | null }));
  const awayDrifts = folders.flatMap(({ proposal, project: home }) =>
    listDrifts(home).filter((d) => d.data.status === "open").map((drift) => ({ drift, home, worktree: proposal })),
  );
  const awayTasks = folders.flatMap(({ proposal, project: home }) => {
    const there = listTasks(home);
    const why = computeBlocked(buildProject(readTrackedFiles(home)), there, listDrifts(home));
    return there.map((task) => ({ task, why, worktree: proposal }));
  });
  const orderedTasks = byCreation(
    [...tasks.map((task) => ({ task, why: blocked, worktree: null as string | null })), ...awayTasks],
    (item) => ({ id: item.task.id, created: item.task.data.created }),
  );
  return {
    ...modelView(project),
    diagnostics: project.diagnostics,
    proposals,
    inWorktree: inWorktreeProposals(p),
    drifts: [
      ...byCreation([...openDrifts, ...awayDrifts], (item) => ({ id: item.drift.id, created: item.drift.data.created })).map((item) => viewDrift(item.home, item.drift, item.worktree)),
      ...mergeDriftViews(p),
    ],
    tasks: orderedTasks.map((item) => viewTask(item.task, item.why, item.worktree)),
    announcements: listAnnouncements(p).map((a) => announcementView(a, a.proposal === null ? undefined : proposalById.get(a.proposal)?.title)),
    multiBranch: multiBranchOn(readMultiBranch(p)),
  };
}

/** The Merge Drift of a round, drawn in To decide. It is not a Drift file of the open folder. */
function mergeDriftViews(p: Project): DriftView[] {
  const drift = mergeDriftDocument(p.root);
  if (!drift) return [];
  return [{
    id: drift.id,
    title: drift.title,
    body: stripTitle(drift.body),
    sides: driftSides(drift),
    options: driftOptions(drift),
    option: null,
    note: null,
    requirementsOnly: false,
    refs: [],
    proposal: null,
    proposalBlock: null,
    worktree: null,
    merge: true,
  }];
}

/** An announcement as the Board draws it; `proposalTitle` is the title of the Draft bound to it, if any. */
export function announcementView(a: Announcement, proposalTitle: string | undefined): AnnouncementView {
  return { id: a.id, kind: a.kind, title: proposalTitle || a.title, phase: a.proposal === null ? "preparing" : "writing" };
}

/** The title is shown separately, so the body drops its leading H1. */
const stripTitle = (body: string): string => body.replace(/^\s*#\s+.+\n+/, "").trim();
