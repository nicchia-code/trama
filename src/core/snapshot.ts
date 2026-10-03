import type { FileChange } from "./diff";
import { type Change, type MergedMachine, mergeMachine } from "./merge";
import { applied, baseFiles, changes, health, listProposals, type ProposalKind } from "./proposals";
import { appliesUnder, type RequiredProposal } from "./required";
import { type Area, buildProject, type ProjectModel } from "./requirements";
import { type Project, readTrackedFiles, REQUIREMENTS_PREFIX } from "./store";
import type { Actor, Diagnostic, Feature, Machine } from "./types";
import { type Column, listDrifts, listTasks } from "./work";

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
  body: string;
  refs: string[];
  /** ID of the attached Proposal, if any. */
  proposal: string | null;
  /** Lifecycle refusal for an attached Proposal absent from the open overlays. */
  proposalBlocker: string | null;
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
  /** Path relative to `.trama/`, for opening the file. */
  file: string;
}

export interface Snapshot extends ModelView {
  diagnostics: Diagnostic[];
  proposals: ProposalView[];
  /** Drafts are Board-only: never overlays and never counted as awaiting a decision. */
  drafts: { id: string; title: string }[];
  drifts: DriftView[];
  tasks: TaskView[];
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

  const allProposals = listProposals(p);
  const proposals = allProposals
    .filter((x) => x.data.status === "open")
    .map((proposal): ProposalView => {
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
  return {
    ...modelView(project),
    diagnostics: project.diagnostics,
    proposals,
    drafts: allProposals.filter((x) => x.data.status === "draft").map((x) => ({ id: x.id, title: x.title })),
    drifts: listDrifts(p)
      .filter((d) => d.data.status === "open")
      .map((d) => {
        const attached = d.data.proposal === null ? undefined : proposalById.get(d.data.proposal);
        const status = attached?.data.status;
        const proposalBlocker = d.data.proposal === null || status === "open" ? null
          : status === "draft" ? `Proposal ${d.data.proposal} is still being written.`
          : status === undefined ? `Proposal ${d.data.proposal} does not exist.`
          : `Proposal ${d.data.proposal} is ${status}.`;
        return { id: d.id, title: d.title, body: stripTitle(d.body), refs: d.data.refs, proposal: d.data.proposal, proposalBlocker };
      }),
    tasks: listTasks(p).map((t) => ({
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
      file: `tasks/${t.name}`,
    })),
  };
}

/** The title is shown separately, so the body drops its leading H1. */
const stripTitle = (body: string): string => body.replace(/^\s*#\s+.+\n+/, "").trim();
