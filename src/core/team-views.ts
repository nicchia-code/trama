import { iterationEnd, type ProjectFields, sprintField } from "./github";
import { appliedFields, type FieldRules, githubBodyOf, handoffIssueWarnings, type IssueFields, type IssueState, listIssues, type ProposalIssue, publicationOrder, publishAgainBlock } from "./issues";
import { type ApprovalBlock, approvalBlock, changes, handoffCoverage, listProposals, type Proposal } from "./proposals";
import type { Project } from "./store";
import type { PublishedIssue } from "./timeline";
import type { Diagnostic } from "./types";

/** One issue of an open handoff as the Decisions tab previews it (`ui#proposal/Open`). */
export interface HandoffIssueView {
  id: string;
  title: string;
  /** The body as GitHub will show it (`rules#issue`), composed with the Manager's reviewer, without the block of references, which `refs` carries. */
  body: string;
  refs: string[];
  dependsOn: string[];
  /** The values of the issue with the Manager's changes applied. */
  values: IssueFields;
  /** The values the agent proposed: what `Undo` goes back to. */
  agent: IssueFields;
  /** The keys of the fields the Manager changed (`assignee`, `reviewer`, `estimate`, `sprint`, `fields.<name>`). */
  changed: string[];
  /** The warnings of this issue (`Estimated <n> d: more than 3 days per issue`) and the ones of the whole handoff (`Not covered: <ref>`), in this order. */
  warnings: string[];
}

/** An open handoff, never a Draft: a card of the Decisions tab. */
export interface HandoffView {
  id: string;
  /** When the agent proposed it, UTC ISO 8601; null for a card written before the field existed. */
  created: string | null;
  title: string;
  /** The epic. */
  label: string | null;
  /** The issues, in the order they will be published. */
  issues: HandoffIssueView[];
  /** How many files of the Model and the Requirements the handoff changes, and how many of them are Machines. */
  files: number;
  machines: number;
  /** How many warnings it has, the ones of its issues and the ones of the handoff. */
  warnings: number;
  /** Why it cannot be approved now (the first reason, as on the Board); null when it can. */
  block: ApprovalBlock | null;
}

/** An issue of an approved handoff: a row of the Issues tab (`ui#issue`). */
export interface IssueRowView {
  id: string;
  title: string;
  handoff: string;
  /** The epic of the handoff it came from; empty when the handoff had none. */
  label: string;
  state: IssueState;
  /** GitHub's number and address, once published. */
  number: number | null;
  url: string | null;
  /** When the agent recorded the publication (ISO 8601), the instant a read of GitHub must be later than for the issue to be expected in it. */
  published: string | null;
  /** Why it is not published. */
  reason: string | null;
  /** The names of the fields GitHub did not take. */
  unset: string[];
  assignee: string | null;
  sprint: string | null;
  estimate: number | null;
  /** Why `Publish again` is not available for this issue's handoff; null when it is. */
  publishBlock: string | null;
}

/** The names the Issues tab gives the fields GitHub did not take: `fields.Priority` is `Priority`. */
export const unsetName = (key: string): string => (key.startsWith("fields.") ? key.slice("fields.".length) : key.charAt(0).toUpperCase() + key.slice(1));

const isMachinePath = (path: string): boolean => {
  const parts = path.split("/");
  const id = (parts.at(-1) ?? "").replace(/\.md$/, "");
  return parts.length === 2 && parts[0] !== "actors" && parts[0] !== "requirements" && id !== "feature";
};

function issueView(p: Project, handoff: Proposal, issue: ProposalIssue, handoffWarnings: readonly string[]): HandoffIssueView {
  const { data } = issue;
  const issueWarnings = handoffIssueWarnings([issue]).map((d: Diagnostic) => d.message);
  return {
    id: issue.id,
    title: issue.title,
    body: githubBodyOf(p, { kind: "file", issue: { ...issue, handoff: handoff.id, label: handoff.data.label ?? null, status: handoff.data.status } }, false),
    refs: data.refs,
    dependsOn: data.dependsOn,
    values: appliedFields(data),
    agent: { estimate: data.estimate, assignee: data.assignee, reviewer: data.reviewer, sprint: data.sprint, fields: { ...data.fields } },
    changed: Object.keys(data.manager),
    warnings: [...issueWarnings, ...handoffWarnings],
  };
}

/** The open handoffs, in creation order, as the Decisions tab shows them. Never a Draft: an agent is still writing it. `proposals` are the Proposals already read: without them they are listed. */
export function handoffViews(p: Project, proposals: readonly Proposal[] = listProposals(p)): HandoffView[] {
  return proposals
    .filter((proposal) => proposal.data.kind === "handoff" && proposal.data.status === "open")
    .map((proposal) => {
      const notCovered = handoffCoverage(p, proposal)
        .filter((entry) => entry.coveredBy.length === 0)
        .map((entry) => `Not covered: ${entry.ref}`);
      const touched = changes(p, proposal).map((change) => change.path);
      const issues = publicationOrder(proposal.issues).map((issue) => issueView(p, proposal, issue, notCovered));
      return {
        id: proposal.id,
        created: proposal.data.created,
        title: proposal.title,
        label: proposal.data.label ?? null,
        issues,
        files: touched.length,
        machines: touched.filter(isMachinePath).length,
        warnings: notCovered.length + proposal.issues.reduce((sum, issue) => sum + handoffIssueWarnings([issue]).length, 0),
        block: approvalBlock(p, proposal.id),
      };
    });
}

/**
 * The issues of the approved handoffs, grouped by handoff in the order of the handoffs' creation and, inside each, in the order they are published (`ui#issue`): the
 * Issues tab groups them by epic from this order.
 */
export function issueRows(p: Project): IssueRowView[] {
  const cards = listIssues(p);
  const handoffs = [...new Set(cards.map((card) => card.data.handoff))];
  const blocks = new Map(handoffs.map((handoff) => [handoff, publishAgainBlock(p, handoff)]));
  return handoffs.flatMap((handoff) =>
    publicationOrder(cards.filter((card) => card.data.handoff === handoff)).map(
      (card): IssueRowView => ({
        id: card.id,
        title: card.title,
        handoff,
        label: card.data.label,
        state: card.data.state,
        number: card.data.number,
        url: card.data.url,
        published: card.data.published,
        reason: card.data.reason,
        unset: card.data.unset.map(unsetName),
        assignee: card.data.assignee,
        sprint: card.data.sprint,
        estimate: card.data.estimate,
        publishBlock: blocks.get(handoff) ?? null,
      }),
    ),
  );
}

/** What the Team view's tabs read of the project; a file that cannot be read leaves its list empty and is reported in `faults`, so the rest of the Snapshot still shows. `proposals` are the Proposals already read, when the caller has read them. */
export function teamViews(p: Project, proposals?: readonly Proposal[]): { handoffs: HandoffView[]; issues: IssueRowView[]; faults: Diagnostic[] } {
  const faults: Diagnostic[] = [];
  const read = <T>(file: string, fn: () => T[]): T[] => {
    try {
      return fn();
    } catch (error) {
      faults.push({ file, line: 0, message: (error as Error).message });
      return [];
    }
  };
  return { handoffs: read("proposals/", () => handoffViews(p, proposals)), issues: read("issues/", () => issueRows(p)), faults };
}

/** The data types of the Project's fields Trama can set to a value the Manager chose, and the kind each is checked as. */
const FIELD_KINDS: Record<string, "single-select" | "number" | "text"> = { SINGLE_SELECT: "single-select", NUMBER: "number", TEXT: "text" };

/** The fields a Project has of its own, which an issue never carries: the Manager cannot change them. */
const OWN_TYPES = new Set(["TITLE", "ASSIGNEES", "LABELS", "LINKED_PULL_REQUESTS", "MILESTONE", "REPOSITORY", "REVIEWERS", "PARENT_ISSUE", "SUB_ISSUES_PROGRESS", "TRACKS", "TRACKED_BY", "ITERATION"]);

/**
 * What the Manager's change of a field is checked against (`rules#developer.CHANGE_ISSUE_FIELD`): the handles of the team, and the iterations and the other fields of the linked
 * Project as the host read them. `members` and `project` are null while they are not known, and then no value that needs them is accepted. `today` is `YYYY-MM-DD`.
 */
export function fieldRulesOf(members: readonly string[] | null, project: ProjectFields | null, today: string): FieldRules {
  const sprint = project === null ? undefined : sprintField(project.fields);
  return {
    members: members === null ? null : new Set(members.map((handle) => handle.toLowerCase())),
    sprints: project === null || sprint === undefined ? null : project.iterations.map((iteration) => ({ title: iteration.title, ended: iterationEnd(iteration) <= today })),
    fields:
      project === null
        ? null
        : Object.fromEntries(
            project.fields
              .filter((field) => !OWN_TYPES.has(field.type))
              .map((field) => [field.name, { kind: FIELD_KINDS[field.type] ?? "other", ...(field.options === undefined ? {} : { options: field.options.map((option) => option.name) }) }] as const),
          ),
  };
}

/** The published issues of the project as the join with GitHub needs them (`issuesOnGitHub`); empty when the cards cannot be read. */
export function publishedIssues(p: Project): PublishedIssue[] {
  try {
    return listIssues(p).flatMap((card) => (card.data.state === "published" && card.data.number !== null ? [{ number: card.data.number, published: card.data.published, estimate: card.data.estimate }] : []));
  } catch {
    return [];
  }
}
