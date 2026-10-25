import type { CardNumbers } from "./card-names";
import { type Announcement, type AnnouncementNote, type CheckPhase, listAnnouncements, resolutionTitle } from "./announcements";
import type { GhostKind } from "./ghost-column";
import type { FileChange } from "./diff";
import { type Change, type MergedMachine, mergeMachine } from "./merge";
import { scanScope } from "./scan-scope";
import { applied, type ApprovalBlock, approvalBlock, baseFiles, changes, coversScope, health, listProposals, type Proposal, type ProposalKind, proposalCoverage, type RemovalEntry, unfixableDrifts } from "./proposals";
import { appliesUnder, type RequiredProposal } from "./required";
import { type ResolvedDrift, resolvedDrifts } from "./resolution";
import { type Area, areaIdOf, buildProject, type Fragment, parseRequirementRef, type ProjectModel } from "./requirements";
import { type Project, readTrackedFiles } from "./store";
import type { Actor, Diagnostic, Feature, Machine } from "./types";
import { type Blocker, computeBlocked } from "./blocking";
import { tasksHeldByDrifts } from "./delete-task";
import { syncShortNumbers } from "./short-numbers";
import { readTaskImages, type TaskImage } from "./task-images";
import { clearedSince, readLastScan } from "./last-scan";
import { attachedDrift, closedUnchanged, type Column, type Drift, type DriftOption, type DriftSides, driftBody, driftOptions, driftSides, type FollowedDrift, followedDrifts, listDrifts, listTasks, taskProgress, unifiedDrifts, unifiedInto } from "./work";
import { preparedFlag, preparedStatus } from "./prepared";
import { type Specs, type SpecsChange, specsChange } from "./specs";
import { type HistoryFault, readHistory } from "./history";

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

/** An image of a Task as the panel gets it: the host adds `uri`, the address the webview loads it from. */
export interface TaskImageView extends TaskImage {
  uri?: string;
}

/** A Task an ordinary Proposal holds, as the Diagram details list it: its body is drawn behind a toggle. */
export interface ProposalTaskView {
  id: string;
  title: string;
  body: string;
  technical: boolean;
  refs: string[];
  /** The images the Task carries for the model that implements it, in order; only those that exist. */
  images: TaskImageView[];
}

/** A Proposal with everything the Diagram needs to draw it as a ghost over the current Model: an open one, or a Draft being refined. */
export interface ProposalView {
  id: string;
  /** When the Proposal was created, UTC ISO 8601; null for a numbered Proposal written before the field existed. */
  created: string | null;
  title: string;
  body: string;
  kind: ProposalKind;
  /** A resolution born from the answer to a Drift's prepared question: it does not stop Resolve while it awaits a decision. */
  prepared: boolean;
  /** Set while a Draft is being refined by a rebase: it is drawn as a ghost until handed over again. */
  refining: boolean;
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
  /** Tasks a change or setup Proposal creates on approval: its own Task files plus one `Remove code of` per removal; 0 for any other kind. */
  creates: number;
  /** The Tasks a change or setup Proposal holds, in file order; empty for any other kind. */
  tasks: ProposalTaskView[];
  /** The `Remove code of` Tasks approval creates, one per removed element; empty for any other kind. */
  removals: RemovalEntry[];
  /** What this Proposal itself changes, on top of the ones it requires. */
  changes: FileChange[];
  /** Every Machine the Proposal touches, before and after drawn as one. */
  machines: MergedMachine[];
  actors: ActorChange[];
  /** Every Area the Proposal touches, before and after drawn as one. */
  areas: AreaView[];
  /** The Specs this Proposal would write: the project's Specs with the Proposal applied (and the open ones it requires). */
  specs: Specs;
  /** What the Proposal changes in the Specs against the Specs it builds on: drawn in the Specs tab. */
  specsChange: SpecsChange;
  /** The references of the Proposal's scope, as `trama proposal show` prints them (`## Scope`): the focus of the Proposal starts from them. */
  scope: string[];
}

export interface DriftView {
  id: string;
  /** When the Drift was created, UTC ISO 8601; null for a numbered Drift written before the field existed. */
  created: string | null;
  title: string;
  /** The Drifts this one follows, each as identity and title, when it is recurring; empty otherwise. A unified Drift can follow several. */
  previous: FollowedDrift[];
  /** The Tasks this Drift remembers as its origin, by identity: none, one, or several for a unified Drift. */
  origin: string[];
  /** The Task that fixes the code of this Drift, by identity; null when none. With the origin Tasks, the Tasks Clear keeps in Done while the Drift is open. */
  task: string | null;
  /** The Drifts a unified Drift merged, in creation order, each as identity and title; empty for any other Drift. */
  unifies: { id: string; title: string }[];
  /** The unified Drift this one was merged into, as identity and title; null unless its resolution is unified. */
  unifiedInto: { id: string; title: string } | null;
  /** The fix Task that dismissed this Drift by closing without changes, with its note while Done; null otherwise. */
  closedUnchanged: { task: string; note: string | null } | null;
  body: string;
  /** The job of the agent terminal that filed the Drift; null when none. */
  job: string | null;
  /** The Drift's prepared question: whether it still holds. Null without a readable one. */
  prepared: { valid: boolean } | null;
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

/** The tag of a Task's Proposal: `text` is its label in full, or its title shortened past 30 characters; `title` is the whole title, for the tooltip. */
export interface ProposalTag {
  text: string;
  /** The Proposal's permanent identity. */
  proposal: string;
  title: string;
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
  /** The tag the Board shows on the Task: the Proposal's label in full, or its title shortened past 30 characters; null when the Task has no Proposal or the Proposal is gone. */
  proposalTag: ProposalTag | null;
  /** True while the agent has taken the Task: the developer cannot move it. */
  agent: boolean;
  /** The percentage the agent declared for the Task it has taken, a multiple of 10; null when none. */
  progress: number | null;
  /** When the Task arrived in Done, UTC ISO 8601; null outside Done and on Tasks that reached Done before the instant was kept. */
  finished: string | null;
  /** When the Task was created, UTC ISO 8601; null on numbered Tasks written before the field existed. */
  created: string | null;
  /** The note of a fix Task closed without changes; null otherwise. Such a Task is not counted in tasksSinceScan. */
  unchanged: string | null;
  /** Why the Task is blocked, if it is: the open Drifts, or the Task that fixes the code of its Drift. Empty when it is free. */
  blockedBy: Blocker[];
  /** True for a Task in To do that a Drift holds, so Delete refuses it: the origin of an open Drift, or the Task that fixes the code of a Drift in Code to be fixed (`tasksHeldByDrifts`). Always false outside To do. */
  heldByDrift: boolean;
  /** Path relative to `.trama/`, for opening the file. */
  file: string;
  /** The images the Task carries for the model that implements it, in order; only those that exist. */
  images: TaskImageView[];
}

/** A card the agent is about to create, drawn as a ghost at the bottom of the column it will land in (see `ghostColumn`), or a work with no column, shown in the status bar. */
export interface AnnouncementView {
  id: string;
  /** A manual scan is a check announced by Trama, shown as Scan. */
  kind: GhostKind;
  /** The Draft's own title once a Draft is bound to it, the announced title before. */
  title: string;
  /** A card: Preparing until a Draft exists, then Writing (a Proposal) or Writing the Proposal (a Drift's Draft). A check: its own phase. An import has none. */
  phase: "preparing" | "writing" | "writing-proposal" | CheckPhase | null;
  /** What the agent declared about what it is doing, oldest first, at most 6; empty when nothing was declared. */
  notes: AnnouncementNote[];
  /** When the announcement was born, UTC ISO 8601: the ghost's details measure how long the work has gone on from it. */
  announced: string;
}

/** A Task cited by a History entry, as it is now; `exists` is false when the Task is gone. */
export interface HistoryTaskView {
  id: string;
  exists: boolean;
  /** True when the Task was deleted with Clear and the entry keeps its copy: `title`, `proposalTag`, `finished` and `refs` come from that copy. */
  cleared: boolean;
  title: string | null;
  column: Column | null;
  unchanged: string | null;
  finished: string | null;
  refs: string[];
  /** The tag the Board shows on the Task: the Proposal's label in full, or its title shortened past 30 characters; null when the Task has no Proposal or the Proposal is gone. */
  proposalTag: ProposalTag | null;
  /** When the Task was created; null when it is gone. The panel lists the Tasks of an entry in this order. */
  created: string | null;
}

/** A History entry as the panel shows it. */
export interface HistoryView {
  id: string;
  title: string;
  summary: string;
  body: string;
  created: string;
  updated: string;
  /** Path relative to `.trama/`, for opening the file. */
  file: string;
  /** The Tasks cited, in the order they were added. */
  tasks: HistoryTaskView[];
}

export interface Snapshot extends ModelView {
  diagnostics: Diagnostic[];
  /** Open Proposals that await a decision: those attached to an open Drift are left out, decided through the Drift. */
  proposals: ProposalView[];
  /** The open Drifts listed in a resolution Proposal still being written or open: they are decided there, not from the panel. */
  resolutionDrifts: string[];
  /** The open Drifts an agent filed in a turn it has not finished: «Dismiss Drift» waits for that turn's end. The editor knows them in memory and passes them in; other callers pass none. */
  finishingDrifts: string[];
  /** The Proposals an agent delivered in a turn it has not finished: Approve and Reject wait for that turn's end. The editor knows them in memory and passes them in; other callers pass none. */
  finishingProposals: string[];
  /** The Tasks an agent filed in a turn it has not finished: their Run waits for that turn's end. The editor knows them in memory and passes them in; other callers pass none. */
  finishingTasks: string[];
  drifts: DriftView[];
  /** The Drifts merged into a unified Drift: they are no longer open and show no card, only their details (`Unified` state, `Unified into`). */
  unifiedDrifts: DriftView[];
  tasks: TaskView[];
  /** Done Tasks finished after this working copy's remembered global Scan launch. */
  tasksSinceScan: number;
  /** The announcements that still exist, in the order they were announced. */
  announcements: AnnouncementView[];
  /** The short numbers of this working copy's live cards: the panel writes `T3` where a card is live and its identity where it is closed. */
  numbers: CardNumbers;
  /** The project's Specs as read; every field empty when the file is absent. Its errors are in `diagnostics`. */
  specs: Specs;
  /** Whether the `specs.yaml` file exists, valid or not. */
  specsPresent: boolean;
  /** The History entries that read, newest first; a Task cited that no longer exists is marked `exists: false`. */
  history: HistoryView[];
  /** History files that do not read; the other entries are still listed. */
  historyFaults: HistoryFault[];
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
  const coverage = coversScope(proposal.data.kind) ? proposalCoverage(p, proposal) : null;
  return {
    id: proposal.id,
    created: proposal.data.created,
    title: proposal.title,
    body: stripTitle(proposal.body),
    kind: proposal.data.kind,
    prepared: proposal.data.prepared,
    refining: proposal.data.refining,
    tasks: coverage === null ? [] : proposal.tasks.map((t) => ({ id: t.id, title: t.title, body: stripTitle(t.body), technical: t.technical, refs: t.refs, images: readTaskImages(p, t.id) })),
    removals: coverage?.removals ?? [],
    creates: coverage === null ? 0 : proposal.tasks.length + coverage.removals.length,
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
    specs: afterProject.specs,
    specsChange: specsChange(baseProject.specs, afterProject.specs),
    scope: scanScope(baseProject, afterProject).map((entry) => entry.ref),
  };
}

/** Everything the extension shows, as plain JSON. Malformed Task or Drift files throw, naming the file. */
export function buildSnapshot(p: Project, finishingDrifts: readonly string[] = [], finishingProposals: readonly string[] = [], finishingTasks: readonly string[] = []): Snapshot {
  const numbers = syncShortNumbers(p).all();
  const project = buildProject(readTrackedFiles(p));

  const tasks = listTasks(p);
  const taskById = new Map(tasks.map((t) => [t.id, t]));
  const history = readHistory(p);
  const scanInstant = Date.parse(readLastScan(p));
  const tasksSinceScan = tasks.filter((t) => t.data.column === "done" && t.data.finished !== null && t.data.unchanged === null && Date.parse(t.data.finished) > scanInstant).length + clearedSince(p, scanInstant);
  const drifts = listDrifts(p);
  const blocked = computeBlocked(project, tasks, drifts);
  const held = tasksHeldByDrifts(drifts);

  const allProposals = listProposals(p);
  const shownProposals = allProposals.filter((x) => x.data.status === "open" || (x.data.status === "draft" && x.data.refining)).map((proposal) => proposalView(p, project, proposal));
  const proposalById = new Map(allProposals.map((x) => [x.id, x]));
  // The developer does not see attached Proposals, so the ghost of a Proposal whose Draft is attached to an open Drift is drawn nowhere.
  // The announcement of a refinement is bound to a Proposal that already has its card (Open, or a Draft left refining): its phase and notes show on that card, never as a ghost of its own.
  const carded = new Set(shownProposals.map((x) => x.id));
  const announcements = listAnnouncements(p).filter((a) => !(a.kind === "proposal" && a.proposal !== null && (attachedDrift(p, a.proposal) || carded.has(a.proposal))));
  const driftView = (d: Drift): DriftView => ({
    id: d.id,
    created: d.data.created,
    title: d.title,
    previous: followedDrifts(p, d),
    origin: d.data.origin,
    task: d.data.task,
    unifies: unifiedDrifts(p, d),
    unifiedInto: unifiedInto(p, d),
    closedUnchanged: closedUnchanged(p, d),
    body: driftBody(d),
    job: d.data.job,
    prepared: preparedFlag(preparedStatus(p, d, project)),
    sides: driftSides(d),
    options: driftOptions(d),
    option: d.data.option,
    note: d.data.note,
    requirementsOnly: d.data.refs.every((r) => parseRequirementRef(r) !== null),
    refs: d.data.refs,
    proposal: d.data.proposal,
    proposalBlock: d.data.proposal === null ? null : approvalBlock(p, d.data.proposal),
    proposalTitle: (d.data.proposal !== null && proposalById.get(d.data.proposal)?.title) || null,
    proposalChanges: shownProposals.find((x) => x.id === d.data.proposal)?.changes ?? null,
  });
  return {
    ...modelView(project),
    specs: project.specs,
    specsPresent: project.specsPresent,
    // A History file that does not read is an error of the Snapshot, shown with the Model's errors; it is not a Model error, so approval does not see it.
    diagnostics: [...project.diagnostics, ...history.faults.map((fault) => ({ file: fault.file, line: 0, message: fault.message }))],
    proposals: shownProposals.filter((v) => !attachedDrift(p, v.id)),
    resolutionDrifts: allProposals.filter((x) => x.data.kind === "resolution" && (x.data.status === "draft" || x.data.status === "open")).flatMap((x) => x.data.drifts.map((d) => d.drift)),
    finishingDrifts: [...finishingDrifts],
    finishingProposals: [...finishingProposals],
    finishingTasks: [...finishingTasks],
    drifts: drifts.filter((d) => d.data.status === "open").map(driftView),
    unifiedDrifts: drifts.filter((d) => d.data.resolution === "unified").map(driftView),
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
      proposalTag: proposalTagOf(t.data.proposal, proposalById),
      agent: t.data.agent,
      progress: taskProgress(p, t),
      finished: t.data.finished,
      created: t.data.created,
      unchanged: t.data.unchanged,
      blockedBy: blocked.get(t.id) ?? [],
      heldByDrift: t.data.column === "todo" && held.has(t.id),
      file: `tasks/${t.name}`,
      images: readTaskImages(p, t.id),
    })),
    announcements: announcements.map((a) => announcementView(p, a, a.proposal === null ? undefined : proposalById.get(a.proposal)?.title)),
    numbers,
    history: history.entries.map((e) => ({
      id: e.id,
      title: e.title,
      summary: e.summary,
      body: e.body,
      created: e.created,
      updated: e.updated,
      file: `history/${e.name}`,
      tasks: e.tasks.map((id): HistoryTaskView => {
        const t = taskById.get(id);
        if (!t) {
          const copy = e.cleared[id];
          if (copy === undefined) return { id, exists: false, cleared: false, title: null, column: null, unchanged: null, finished: null, refs: [], proposalTag: null, created: null };
          const tag = copy.tag === null ? null : { text: copy.tag, proposal: copy.proposal ?? "", title: (copy.proposal !== null && proposalById.get(copy.proposal)?.title) || copy.tag };
          return { id, exists: false, cleared: true, title: copy.title, column: "done", unchanged: null, finished: copy.finished, refs: copy.refs, proposalTag: tag, created: null };
        }
        return {
          id,
          exists: true,
          cleared: false,
          title: t.title,
          created: t.data.created,
          column: t.data.column,
          unchanged: t.data.unchanged,
          finished: t.data.finished,
          refs: t.data.refs,
          proposalTag: proposalTagOf(t.data.proposal, proposalById),
        };
      }),
    })),
    historyFaults: history.faults,
  };
}

/** The tag of a Task's Proposal: its label in full, or else its title shortened past 30 characters; null when the Task has no Proposal or the Proposal is gone. */
export function proposalTagOf(id: string | null, proposalById: ReadonlyMap<string, Proposal>): ProposalTag | null {
  if (id === null) return null;
  const proposal = proposalById.get(id);
  if (proposal === undefined) return null;
  return { text: proposal.data.label || shortenTitle(proposal.title), proposal: id, title: proposal.title };
}

/** A title past 30 characters, cut there with an ellipsis; counted in code points, so no character is split. */
function shortenTitle(title: string): string {
  const chars = [...title];
  return chars.length > 30 ? `${chars.slice(0, 30).join("")}…` : title;
}

/** An announcement as the Board draws it; `proposalTitle` is the title of the Draft bound to it, if any. Only a Proposal's ghost takes its Draft's title: a Drift and a Resolve Drifts keep their own. */
export function announcementView(p: Project, a: Announcement, proposalTitle: string | undefined): AnnouncementView {
  // A Proposal that names Drifts is the Resolve Drifts ghost: its title comes from the Drifts it names, never from the Draft.
  const resolving = a.kind === "proposal" && a.drifts.length > 0;
  // A Drift Trama announces at launch (source `request`) is the ghost of Unify Drifts: an agent's own Drift is announced by the agent.
  const kind = resolving ? "resolve" : a.kind === "check" && a.source === "request" ? "scan" : a.kind === "drift" && a.source === "request" ? "unify" : a.kind;
  const phase = a.kind === "work" || a.kind === "comparison" ? null : a.phase ?? (a.proposal === null ? "preparing" : a.kind === "drift" ? "writing-proposal" : "writing");
  const title = resolving ? resolutionTitle(p, a.drifts) ?? a.title : (a.kind === "proposal" && a.proposal !== null && proposalTitle) || a.title;
  return { id: a.id, kind, title, phase, notes: a.notes, announced: a.announced };
}

/** The title is shown separately, so the body drops its leading H1. */
const stripTitle = (body: string): string => body.replace(/^\s*#\s+.+\n+/, "").trim();
