import { existsSync } from "node:fs";
import { join } from "node:path";
import { referenceFingerprint } from "./describe";
import { RUN_IN_PROGRESS } from "./design";
import { TramaError } from "./errors";
import { withFileLock } from "./file-lock";
import { linkedGithubProject } from "./github";
import { requireTeam, teamUnavailableReason } from "./manager-mode";
import { loadProject, resolves } from "./requirements";
import { compareByCreation, createdField, enumField, instantField, type Raw, stringList, textOrNull } from "./schema";
import { readSoloMode } from "./solo-mode";
import { type FollowFacts, unfollowedTasks } from "./task-holders";
import { createdNow, type Document, listCards, listNames, type Project, readDocument, slugify, writeDocument } from "./store";
import type { Diagnostic } from "./types";

/*
 * The issues of Team (`data#issue`, `rules#issue`). A handoff is a Proposal with `kind: handoff` that holds issue files in its
 * `issues/` folder; approving it writes one card per issue in `.trama/issues/`, which the agent publishes on GitHub and records
 * with `trama issue move` and `trama issue edit`. This module holds both shapes, the order of publication, the body composed
 * for GitHub and the state moves of a card.
 */

export const ISSUE_STATES = ["publishing", "not-published", "published"] as const;
export type IssueState = (typeof ISSUE_STATES)[number];

/** Why a `publishing` issue goes to Not published when its publishing agent is gone (`rules#issue`). */
export const STOPPED_REASON = "The agent stopped before publishing it.";

/** What the Manager reads when Publish again is asked without a GitHub Project linked. */
export const LINK_PROJECT_FIRST = "Link a GitHub Project first";

export const issuesDir = (p: Project): string => join(p.dir, "issues");
const issueLocksDir = (p: Project): string => join(issuesDir(p), ".locks");
const proposalsDir = (p: Project): string => join(p.dir, "proposals");

/** The fields of an issue that the agent proposes and the Manager may change, with the Manager's values applied. */
export interface IssueFields {
  /** Days. */
  estimate: number | null;
  /** GitHub handles, without `@`. */
  assignee: string | null;
  reviewer: string | null;
  /** The title of an iteration of the linked Project. */
  sprint: string | null;
  /** The other fields of the Project: name to value as text. */
  fields: Record<string, string>;
}

/** A value of `manager` in the file of an issue of a handoff: `null` is the Manager choosing nobody, no sprint or no value. */
export type ManagerValue = string | number | null;

/** The key of a field the Manager can change: `assignee`, `reviewer`, `estimate`, `sprint` or `fields.<name>`. */
export const isFieldKey = (key: string): boolean => key === "assignee" || key === "reviewer" || key === "estimate" || key === "sprint" || /^fields\.\S(?:.*\S)?$/.test(key);

/** The front matter of an issue file inside a handoff (`data#issue`). */
export interface ProposalIssueData extends IssueFields {
  refs: string[];
  dependsOn: string[];
  /** The Manager's values, by field key; where a key is here its value is the issue's and the agent's value stays in its own field. */
  manager: Record<string, ManagerValue>;
  /** The creation instant, when the file remembers one. */
  created: string | null;
}

/** The front matter of an issue card of `.trama/issues/` (`data#issue`): the Manager's values already applied. */
export interface IssueData extends IssueFields {
  /** The identity of the handoff (Proposal) the issue comes from. */
  handoff: string;
  /** The handoff's label: the epic. */
  label: string;
  refs: string[];
  dependsOn: string[];
  /** The approval instant. */
  created: string | null;
  state: IssueState;
  /** GitHub's number and address, from the publication. */
  number: number | null;
  url: string | null;
  /** When the agent recorded the publication. */
  published: string | null;
  /** Keys of the fields GitHub did not take. */
  unset: string[];
  /** Why the issue is not published. */
  reason: string | null;
  /** When the last Comment update was recorded. */
  updated: string | null;
  /** The text fingerprint of each reference at publication or at the last Comment update. */
  texts: Record<string, string>;
  /** The terminal (or omp Chat conversation) that publishes the issue while it is `publishing`. Only while publishing. */
  agent: string | null;
}

interface IssueText {
  /** `<id>-<slug>.md`. */
  name: string;
  path: string;
  id: string;
  title: string;
  /** What the agent wrote for GitHub, without the title and without the lines Trama adds. */
  body: string;
}

export interface Issue extends IssueText {
  data: IssueData;
}

/** An issue file of a handoff, `issues/<identity>-<slug>.md`. `problems` are what validation reports for the file; they do not stop the handoff from loading. */
export interface ProposalIssue extends IssueText {
  data: ProposalIssueData;
  problems: string[];
}

/** An issue file together with the handoff it is in: `label` is the handoff's, null when it has none, and `status` its status (`draft` or `open`, the only ones listed). */
export interface HandoffIssue extends ProposalIssue {
  handoff: string;
  label: string | null;
  status: string;
}

const RANDOM_ID = /^[a-z0-9]{8}$/;

function describe(v: unknown): string {
  return Array.isArray(v) ? "a list" : v === null ? "null" : `a ${typeof v}`;
}

function estimateField(raw: Raw, where: string): number | null {
  const v = raw["estimate"];
  if (v === undefined || v === null) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  throw new TramaError(`${where}: "estimate" must be a number of days, found ${JSON.stringify(v)}`);
}

function handleField(raw: Raw, key: string, where: string): string | null {
  const v = textOrNull(raw, key, where)?.trim().replace(/^@/, "") ?? "";
  return v === "" ? null : v;
}

/** The value of a Project field as text: a number or a boolean written without quotes is read as its text. */
function fieldValue(v: unknown, where: string, key: string): string {
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  throw new TramaError(`${where}: "${key}" must hold values as text, found ${describe(v)}`);
}

function fieldsField(raw: Raw, where: string): Record<string, string> {
  const v = raw["fields"];
  if (v === undefined || v === null) return {};
  if (typeof v !== "object" || Array.isArray(v)) throw new TramaError(`${where}: "fields" must map the names of the Project's fields to their values, found ${describe(v)}`);
  return Object.fromEntries(Object.entries(v).map(([name, value]) => [name, fieldValue(value, where, `fields.${name}`)]));
}

function dependsOnField(raw: Raw, where: string): string[] {
  const ids = stringList(raw, "dependsOn", where);
  const bad = ids.find((id) => !RANDOM_ID.test(id));
  if (bad !== undefined) throw new TramaError(`${where}: "dependsOn" must hold issue identities (eight lowercase letters and digits), found ${JSON.stringify(bad)}`);
  return [...new Set(ids)];
}

function managerField(raw: Raw, where: string): Record<string, ManagerValue> {
  const v = raw["manager"];
  if (v === undefined || v === null) return {};
  if (typeof v !== "object" || Array.isArray(v)) throw new TramaError(`${where}: "manager" must map field keys to values, found ${describe(v)}`);
  const out: Record<string, ManagerValue> = {};
  for (const [key, value] of Object.entries(v)) {
    if (!isFieldKey(key)) throw new TramaError(`${where}: "manager" has the key ${JSON.stringify(key)}, which is not a field: use assignee, reviewer, estimate, sprint or fields.<name>`);
    if (value !== null && typeof value !== "string" && typeof value !== "number") throw new TramaError(`${where}: "manager.${key}" must be text, a number or none, found ${describe(value)}`);
    out[key] = value;
  }
  return out;
}

/** The front matter of an issue file in a handoff, checked field by field. */
export function parseProposalIssueData(raw: Raw, where: string): ProposalIssueData {
  return {
    refs: stringList(raw, "refs", where),
    estimate: estimateField(raw, where),
    assignee: handleField(raw, "assignee", where),
    reviewer: handleField(raw, "reviewer", where),
    sprint: textOrNull(raw, "sprint", where),
    fields: fieldsField(raw, where),
    dependsOn: dependsOnField(raw, where),
    manager: managerField(raw, where),
    created: createdField(raw, where),
  };
}

function numberField(raw: Raw, key: string, where: string): number | null {
  const v = raw[key];
  if (v === undefined || v === null) return null;
  if (typeof v === "number" && Number.isInteger(v) && v >= 1) return v;
  throw new TramaError(`${where}: "${key}" must be a whole number from 1, found ${JSON.stringify(v)}`);
}

function textsField(raw: Raw, where: string): Record<string, string> {
  const v = raw["texts"];
  if (v === undefined || v === null) return {};
  if (typeof v !== "object" || Array.isArray(v) || Object.values(v).some((x) => typeof x !== "string")) throw new TramaError(`${where}: "texts" must map references to text fingerprints, found ${describe(v)}`);
  return v as Record<string, string>;
}

function cardHandoff(raw: Raw, where: string): string {
  const v = raw["handoff"];
  if (typeof v === "string" && RANDOM_ID.test(v)) return v;
  throw new TramaError(`${where}: "handoff" must be the identity of the Proposal the issue comes from, found ${JSON.stringify(v)}`);
}

/** The front matter of an issue card, checked field by field. */
export function parseIssueData(raw: Raw, where: string): IssueData {
  const label = textOrNull(raw, "label", where);
  if (label === null || label.trim() === "") throw new TramaError(`${where}: "label" must be the label of the handoff`);
  return {
    handoff: cardHandoff(raw, where),
    label,
    refs: stringList(raw, "refs", where),
    estimate: estimateField(raw, where),
    assignee: handleField(raw, "assignee", where),
    reviewer: handleField(raw, "reviewer", where),
    sprint: textOrNull(raw, "sprint", where),
    fields: fieldsField(raw, where),
    dependsOn: dependsOnField(raw, where),
    created: createdField(raw, where),
    state: enumField(raw, "state", ISSUE_STATES, "publishing", where),
    number: numberField(raw, "number", where),
    url: textOrNull(raw, "url", where),
    published: instantField(raw, "published", where),
    unset: stringList(raw, "unset", where),
    reason: textOrNull(raw, "reason", where),
    updated: instantField(raw, "updated", where),
    texts: textsField(raw, where),
    agent: textOrNull(raw, "agent", where),
  };
}

/** The title (the first `#` heading) and the body (what follows it, trimmed) of an issue file. */
export function splitIssueText(text: string, fallbackTitle: string): { title: string; body: string } {
  const heading = /^#[ \t]+(.+)$/m.exec(text);
  if (heading === null) return { title: fallbackTitle, body: text.trim() };
  const at = heading.index ?? 0;
  return { title: (heading[1] as string).trim(), body: `${text.slice(0, at)}${text.slice(at + heading[0].length)}`.trim() };
}

/** The Markdown of an issue file: the title as `#`, then the body. */
export const issueFileBody = (title: string, body: string): string => `# ${title}\n\n${body.trim()}\n`;

function readIssueText(dir: string, entry: { id: string; name: string }): { text: IssueText; raw: Raw } {
  const path = join(dir, entry.name);
  const doc = readDocument(path);
  const { title, body } = splitIssueText(doc.body, entry.name);
  return { text: { id: entry.id, name: entry.name, path, title, body }, raw: doc.data };
}

function loadIssue(entry: { id: string; name: string }, dir: string): Issue {
  const { text, raw } = readIssueText(dir, entry);
  return { ...text, data: parseIssueData(raw, text.path) };
}

/** The issue cards of `.trama/issues/`, in creation order. */
export function listIssues(p: Project): Issue[] {
  const dir = issuesDir(p);
  return listCards(dir, "file")
    .map((entry) => loadIssue(entry, dir))
    .sort((a, b) => compareByCreation({ id: a.id, created: a.data.created }, { id: b.id, created: b.data.created }));
}

/** The issue cards of the handoff `handoff`, in the order of publication. */
export const issuesOfHandoff = (p: Project, handoff: string): Issue[] => publicationOrder(listIssues(p).filter((issue) => issue.data.handoff === handoff));

function blankProposalIssueData(): ProposalIssueData {
  return { refs: [], estimate: null, assignee: null, reviewer: null, sprint: null, fields: {}, dependsOn: [], manager: {}, created: null };
}

function parseProposalIssue(path: string, name: string): ProposalIssue {
  const id = /^([a-z0-9]{8})-.+\.md$/.exec(name)?.[1] ?? "";
  const blank: ProposalIssue = { id, name, path, title: "", body: "", data: blankProposalIssueData(), problems: [] };
  if (id === "") return { ...blank, problems: ["the file name must be <identity>-<slug>.md"] };
  let doc: Document;
  try {
    doc = readDocument(path);
  } catch (error) {
    return { ...blank, problems: [(error as Error).message] };
  }
  const { title, body } = splitIssueText(doc.body, "");
  const problems: string[] = [];
  if (title === "") problems.push("the issue has no H1 title");
  if (body === "") problems.push(`the issue${title === "" ? "" : ` "${title}"`} has an empty body`);
  let data = blankProposalIssueData();
  try {
    data = parseProposalIssueData(doc.data, path);
  } catch (error) {
    problems.push((error as Error).message.replace(`${path}: `, ""));
  }
  return { ...blank, title, body, data, problems };
}

/** The issue files under a handoff folder's `issues/`, by name. A file that cannot be read is kept with its problem, so the handoff still loads. */
export function loadProposalIssues(dir: string): ProposalIssue[] {
  const folder = join(dir, "issues");
  return listNames(folder)
    .filter((name) => name.endsWith(".md") && !name.startsWith("."))
    .sort()
    .map((name) => parseProposalIssue(join(folder, name), name));
}

/** The issue files of the handoffs being written or open, in the order of their names. Every file with an identity is listed, also one with problems. */
export function listProposalIssues(p: Project): HandoffIssue[] {
  const out: HandoffIssue[] = [];
  const root = proposalsDir(p);
  for (const folder of listCards(root, "folder")) {
    let proposal: Raw;
    try {
      proposal = readDocument(join(root, folder.name, "proposal.md")).data;
    } catch {
      continue;
    }
    const status = proposal["status"];
    if (proposal["kind"] !== "handoff" || (status !== "draft" && status !== "open")) continue;
    const label = typeof proposal["label"] === "string" ? proposal["label"] : null;
    for (const issue of loadProposalIssues(join(root, folder.name))) if (issue.id !== "") out.push({ ...issue, handoff: folder.id, label, status });
  }
  return out;
}

/** The issue a command names: a card of `.trama/issues/` or a file of a handoff not approved yet, by identity, file name or a prefix only one issue has. */
export type FoundIssue = { kind: "card"; issue: Issue } | { kind: "file"; issue: HandoffIssue };

export function findIssue(p: Project, query: string): FoundIssue {
  const stem = query.endsWith(".md") ? query.slice(0, -3) : query;
  const candidates: FoundIssue[] = [];
  const dir = issuesDir(p);
  for (const entry of listCards(dir, "file")) candidates.push({ kind: "card", issue: loadIssue(entry, dir) });
  for (const issue of listProposalIssues(p)) if (!candidates.some((c) => c.issue.id === issue.id)) candidates.push({ kind: "file", issue });
  const exact = candidates.filter((c) => c.issue.id === query || c.issue.name === query || c.issue.name === `${stem}.md`);
  const hits = exact.length > 0 ? exact : candidates.filter((c) => /^[a-z0-9]+$/.test(query) && c.issue.id.startsWith(query));
  if (hits.length === 1) return hits[0] as FoundIssue;
  if (hits.length > 1) throw new TramaError(`Several issues match "${query}": ${hits.map((h) => h.issue.id).sort().join(", ")}`);
  throw new TramaError(`No issue with ID "${query}"`);
}

/** The value of each field of an issue file with the Manager's values applied over the agent's. */
export function appliedFields(data: ProposalIssueData): IssueFields {
  const out: IssueFields = { estimate: data.estimate, assignee: data.assignee, reviewer: data.reviewer, sprint: data.sprint, fields: { ...data.fields } };
  for (const [key, value] of Object.entries(data.manager)) {
    if (key === "assignee" || key === "reviewer") out[key] = value === null ? null : String(value).replace(/^@/, "");
    else if (key === "sprint") out.sprint = value === null ? null : String(value);
    else if (key === "estimate") out.estimate = typeof value === "number" ? value : value === null ? null : Number(value);
    else {
      const name = key.slice("fields.".length);
      if (value === null) delete out.fields[name];
      else out.fields[name] = String(value);
    }
  }
  return out;
}

/** Issues in the order they are published: those an issue depends on first, the oldest first otherwise. A cycle (refused at hand-over) is broken at its oldest issue. */
export function publicationOrder<T extends { id: string; data: { created: string | null; dependsOn: readonly string[] } }>(items: readonly T[]): T[] {
  const remaining = [...items].sort((a, b) => compareByCreation({ id: a.id, created: a.data.created }, { id: b.id, created: b.data.created }));
  const known = new Set(remaining.map((item) => item.id));
  const done = new Set<string>();
  const out: T[] = [];
  while (remaining.length > 0) {
    const ready = remaining.findIndex((item) => item.data.dependsOn.every((id) => id === item.id || !known.has(id) || done.has(id)));
    const [next] = remaining.splice(ready === -1 ? 0 : ready, 1) as [T];
    done.add(next.id);
    out.push(next);
  }
  return out;
}

/** What the body of an issue says of one issue it depends on: GitHub's number when it is published, its title otherwise. */
export interface BodyDependency {
  number: number | null;
  title: string;
}

/** What the body composed for GitHub is made of. */
export interface BodyInput {
  /** What the agent wrote. */
  body: string;
  reviewer: string | null;
  dependencies: readonly BodyDependency[];
  refs: readonly string[];
  /** Solo mode on: nobody else reads the issue's references in the repository, so the block is left out. */
  solo: boolean;
}

/**
 * The body published on GitHub (`rules#issue`), composed by Trama and the same in the preview and on GitHub: `**Reviewer:** @<handle>` when there is a
 * reviewer, `**Depends on:** #<n>, …` when it depends on issues (a published one by its number, any other by its title), an empty line when either
 * line is there, the body the agent wrote, and, except with Solo mode on and when there is a reference, the folded block of the references as inline code.
 * Nothing else.
 */
export function githubBody(input: BodyInput): string {
  const head: string[] = [];
  if (input.reviewer !== null) head.push(`**Reviewer:** @${input.reviewer}`);
  if (input.dependencies.length > 0) head.push(`**Depends on:** ${input.dependencies.map((d) => (d.number === null ? d.title : `#${d.number}`)).join(", ")}`);
  const parts = [...(head.length > 0 ? [head.join("\n")] : []), input.body.trim()].filter((part) => part !== "");
  if (!input.solo && input.refs.length > 0) parts.push(`<details><summary>Trama references</summary>\n\n${input.refs.map((ref) => `- \`${ref}\``).join("\n")}\n\n</details>`);
  return `${parts.join("\n\n")}\n`;
}

/** The dependencies of an issue as its body names them, from the cards and the files of handoffs as they are now; an identity that names no issue is left out. */
function bodyDependencies(p: Project, dependsOn: readonly string[]): BodyDependency[] {
  const cards = new Map(listIssues(p).map((issue) => [issue.id, issue]));
  const files = new Map(listProposalIssues(p).map((issue) => [issue.id, issue]));
  return dependsOn.flatMap((id) => {
    const card = cards.get(id);
    if (card !== undefined) return [{ number: card.data.state === "published" ? card.data.number : null, title: card.title }];
    const file = files.get(id);
    return file === undefined ? [] : [{ number: null, title: file.title }];
  });
}

/** The values of an issue as the Manager approved them: a card's own, a file's with the Manager's values applied. */
export function effective(found: FoundIssue): IssueFields & { refs: string[]; dependsOn: string[]; label: string | null } {
  if (found.kind === "card") {
    const { estimate, assignee, reviewer, sprint, fields, refs, dependsOn, label } = found.issue.data;
    return { estimate, assignee, reviewer, sprint, fields, refs, dependsOn, label };
  }
  return { ...appliedFields(found.issue.data), refs: found.issue.data.refs, dependsOn: found.issue.data.dependsOn, label: found.issue.label };
}

/**
 * The body composed for GitHub for an issue, read from the project as it is now (`rules#issue`). `references: false` leaves the folded block of the references out: the preview
 * of the Decisions tab shows them apart, as chips (`ui#proposal/Open`).
 */
export function githubBodyOf(p: Project, found: FoundIssue, references = true): string {
  const values = effective(found);
  return githubBody({ body: found.issue.body, reviewer: values.reviewer, dependencies: bodyDependencies(p, values.dependsOn), refs: values.refs, solo: !references || readSoloMode(p) !== "off" });
}

/** The text fingerprint of each reference of `refs` as the Model and Requirements are now: the one of `tech#scans`. A reference that does not resolve has none. */
export function referenceTexts(p: Project, refs: readonly string[]): Record<string, string> {
  const project = loadProject(p);
  const texts: Record<string, string> = {};
  for (const ref of refs) if (resolves(project, ref)) texts[ref] = referenceFingerprint(project, ref);
  return texts;
}

/** The front matter of a card as it is written: empty values stay out of the file. */
function cardFront(data: IssueData): Record<string, unknown> {
  const front: Record<string, unknown> = { handoff: data.handoff, label: data.label, refs: data.refs };
  if (data.estimate !== null) front["estimate"] = data.estimate;
  if (data.assignee !== null) front["assignee"] = data.assignee;
  if (data.reviewer !== null) front["reviewer"] = data.reviewer;
  if (data.sprint !== null) front["sprint"] = data.sprint;
  if (Object.keys(data.fields).length > 0) front["fields"] = data.fields;
  if (data.dependsOn.length > 0) front["dependsOn"] = data.dependsOn;
  if (data.created !== null) front["created"] = data.created;
  front["state"] = data.state;
  if (data.number !== null) front["number"] = data.number;
  if (data.url !== null) front["url"] = data.url;
  if (data.published !== null) front["published"] = data.published;
  if (data.unset.length > 0) front["unset"] = data.unset;
  if (data.reason !== null) front["reason"] = data.reason;
  if (data.updated !== null) front["updated"] = data.updated;
  if (Object.keys(data.texts).length > 0) front["texts"] = data.texts;
  if (data.agent !== null && data.state === "publishing") front["agent"] = data.agent;
  return front;
}

/** Writes an issue card as it now stands. */
export function saveIssue(issue: Issue): void {
  writeDocument(issue.path, cardFront(issue.data), issueFileBody(issue.title, issue.body));
}

const withIssueLock = <T>(p: Project, id: string, fn: () => T): T => withFileLock(issueLocksDir(p), id, fn);

function cardOf(p: Project, query: string): Issue {
  const found = findIssue(p, query);
  if (found.kind === "file") throw new TramaError(`Issue ${found.issue.id} is in the handoff ${found.issue.handoff}, which is not approved yet: its issues are published after the Manager approves it`);
  return found.issue;
}

/** What `trama issue move` records: GitHub's number and address with `published`, the reason with `not-published`. */
export interface IssueMove {
  number?: number;
  url?: string;
  reason?: string;
}

/**
 * Moves the card `query` names (`cli#issue`). `published` records GitHub's number and address, the moment and the text fingerprint of each reference
 * (`rules#issue`); `not-published` records the reason. `publishing` is refused (only Trama moves an issue there), and so is a move of an issue that is
 * already published. Team must be available.
 */
export function moveIssue(p: Project, query: string, to: IssueState, input: IssueMove = {}): Issue {
  requireTeam(p);
  if (to === "publishing") throw new TramaError("Only Trama moves an issue to publishing: the agent records the outcome with `published` or `not-published`");
  const found = cardOf(p, query);
  return withIssueLock(p, found.id, () => {
    const issue = cardOf(p, found.id);
    if (issue.data.state === "published") throw new TramaError(`Issue ${issue.id} is already published as #${issue.data.number}: it cannot be moved`);
    if (to === "published") {
      if (input.number === undefined || input.url === undefined) throw new TramaError("Moving an issue to published needs the number and the address GitHub gave it");
      if (!/^https?:\/\/\S+$/.test(input.url)) throw new TramaError(`The address of the issue must be an http or https address, found ${JSON.stringify(input.url)}`);
      issue.data = { ...issue.data, state: "published", number: input.number, url: input.url, published: createdNow(), reason: null, unset: [], texts: referenceTexts(p, issue.data.refs), agent: null };
    } else {
      const reason = input.reason?.trim() ?? "";
      if (reason === "") throw new TramaError("Moving an issue to not-published needs the reason");
      issue.data = { ...issue.data, state: "not-published", reason, agent: null };
    }
    saveIssue(issue);
    return issue;
  });
}

/** What `trama issue edit` records on a published issue. */
export interface IssueEdit {
  /** The keys of the fields GitHub did not take; replaces the earlier list. */
  unset?: readonly string[];
  /** A Comment update was written: records the moment and the text of the references now. */
  updated?: boolean;
}

/** Records, on a published issue, the fields GitHub did not take and a Comment update (`cli#issue`). Nothing else of an issue changes from the command line. */
export function editIssue(p: Project, query: string, input: IssueEdit): Issue {
  requireTeam(p);
  const found = cardOf(p, query);
  if (input.unset === undefined && input.updated !== true) throw new TramaError("Nothing to record: give `unset` or `updated`");
  const bad = input.unset?.find((key) => !isFieldKey(key));
  if (bad !== undefined) throw new TramaError(`${JSON.stringify(bad)} is not a field: use assignee, reviewer, estimate, sprint or fields.<name>`);
  return withIssueLock(p, found.id, () => {
    const issue = cardOf(p, found.id);
    if (issue.data.state !== "published") throw new TramaError(`Issue ${issue.id} is not published: only a published issue records fields GitHub did not take or a Comment update`);
    if (input.unset !== undefined) issue.data.unset = [...new Set(input.unset)];
    if (input.updated === true) {
      issue.data.updated = createdNow();
      issue.data.texts = referenceTexts(p, issue.data.refs);
    }
    saveIssue(issue);
    return issue;
  });
}

/** The issues `publishing` now, with the terminal that publishes each (null when none is recorded). */
export const publishingIssues = (p: Project): { id: string; holder: string | null; handoff: string }[] =>
  existsSync(issuesDir(p)) ? listIssues(p).filter((i) => i.data.state === "publishing").map((i) => ({ id: i.id, holder: i.data.agent, handoff: i.data.handoff })) : [];

/**
 * The `publishing` issues whose publishing agent is gone (`time.CHECK_DUE`): nobody follows the terminal that holds them and the process registered for it is
 * not alive, on the terms of the Tasks nobody follows. An issue with no known publisher is never one.
 */
export const goneIssues = (publishing: readonly { id: string; holder: string | null }[], facts: FollowFacts): string[] => unfollowedTasks({ tasks: publishing.map(({ id, holder }) => ({ id, holder })), ...facts });

/**
 * A publication of the handoff `handoff` starts in the terminal `holder`: every issue of the handoff that is not published is `publishing`, held by that terminal
 * (`developer.PUBLISH_AGAIN`; after the approval the issues already are). Returns the identities, in the order of publication.
 */
export function beginPublishing(p: Project, handoff: string, holder: string): string[] {
  const begun: string[] = [];
  for (const { id } of issuesOfHandoff(p, handoff)) {
    withIssueLock(p, id, () => {
      const issue = cardOf(p, id);
      if (issue.data.state === "published") return;
      issue.data = { ...issue.data, state: "publishing", reason: null, agent: holder };
      saveIssue(issue);
      begun.push(id);
    });
  }
  return begun;
}

/**
 * Moves to Not published, with `reason`, the issues of `ids` that are still publishing (`time.CHECK_DUE`: their publishing agent is gone, and it recorded nothing; or the
 * publication did not start). With `holder` only those it still holds. Returns the issues moved.
 */
export function stopPublishing(p: Project, ids: readonly string[], reason: string, holder?: string): Issue[] {
  const stopped: Issue[] = [];
  for (const id of ids) {
    withIssueLock(p, id, () => {
      const issue = cardOf(p, id);
      if (issue.data.state !== "publishing" || (holder !== undefined && issue.data.agent !== holder)) return;
      issue.data = { ...issue.data, state: "not-published", reason, agent: null };
      saveIssue(issue);
      stopped.push(issue);
    });
  }
  return stopped;
}

/**
 * Why Publish again is not available for the handoff `handoff`, or null when it is: Team is not available (`rules#manager-mode`), no GitHub Project is linked,
 * a publication of the handoff is running, or no issue of it waits to be published.
 */
export function publishAgainBlock(p: Project, handoff: string): string | null {
  const team = teamUnavailableReason(p);
  if (team !== null) return team;
  if (linkedGithubProject(p) === null) return LINK_PROJECT_FIRST;
  const issues = listIssues(p).filter((issue) => issue.data.handoff === handoff);
  if (issues.some((issue) => issue.data.state === "publishing")) return "The issues of this handoff are being published";
  if (!issues.some((issue) => issue.data.state === "not-published")) return "No issue of this handoff waits to be published";
  return null;
}

/** The members of the team as the hand-over of a handoff knows them: the GitHub handles the editor answered, in lower case, or why the editor could not answer. */
export type TeamRoster = { handles: ReadonlySet<string> } | { reason: string };

/** The roster of the people the editor answered with. */
export const rosterOf = (members: readonly { handle: string }[]): TeamRoster => ({ handles: new Set(members.map((member) => member.handle.toLowerCase())) });

/** What an estimate says when it is not a number of days from 0.5 in steps of 0.5. */
export const ESTIMATE_PROBLEM = "Enter 0.5 days or more, in steps of 0.5.";

/** An issue estimated more than this many days is only a warning of the handoff, and can be split. */
export const LONG_ISSUE_DAYS = 3;

/** Whether `value` is an estimate: a number of days from 0.5, in steps of 0.5. */
export const isEstimate = (value: unknown): value is number => typeof value === "number" && value >= 0.5 && Number.isInteger(value * 2);

/** What the checks of a handoff's issues need to know. */
export interface HandoffCheck {
  issues: readonly ProposalIssue[];
  /** Whether a reference resolves with the handoff applied. */
  resolves: (ref: string) => boolean;
  /** The identities of the issues of the handoffs it requires: its issues may depend on them. */
  required: ReadonlySet<string>;
  /** The GitHub handles of the team, in lower case; absent when the members are not checked (validation), given at the hand-over. */
  team?: ReadonlySet<string>;
}

const issueName = (issue: ProposalIssue): string => (issue.title === "" ? `Issue ${issue.id}` : `Issue "${issue.title}"`);

/** The first dependency cycle among `issues`, as the titles along it, or null. */
function dependencyCycle(issues: readonly ProposalIssue[]): string[] | null {
  const byId = new Map(issues.map((issue) => [issue.id, issue]));
  const state = new Map<string, "visiting" | "done">();
  const path: string[] = [];
  const visit = (id: string): string[] | null => {
    const issue = byId.get(id);
    if (issue === undefined || state.get(id) === "done") return null;
    if (state.get(id) === "visiting") return [...path.slice(path.indexOf(id)), id].map((x) => byId.get(x)?.title || x);
    state.set(id, "visiting");
    path.push(id);
    for (const dependency of issue.data.dependsOn) {
      const cycle = dependency === id ? null : visit(dependency);
      if (cycle !== null) return cycle;
    }
    path.pop();
    state.set(id, "done");
    return null;
  };
  for (const issue of issues) {
    const cycle = visit(issue.id);
    if (cycle !== null) return cycle;
  }
  return null;
}

/**
 * What is wrong with the issues of a handoff (`rules#proposal/Draft`): no issue at all, a file with its own problems, a missing title or empty body, an estimate that is not a
 * number of days from 0.5 in steps of 0.5, an assignee or a reviewer outside the team (with `team`) or the same person for both, a dependency outside the handoff and the
 * handoffs it requires or a cycle of dependencies, a reference that does not exist. Each problem names the file.
 */
export function handoffProblems({ issues, resolves, required, team }: HandoffCheck): Diagnostic[] {
  const out: Diagnostic[] = [];
  const at = (issue: ProposalIssue, message: string): void => void out.push({ file: `issues/${issue.name}`, line: 0, message });
  if (issues.length === 0) out.push({ file: "proposal.md", line: 0, message: "a handoff needs at least one issue in issues/" });
  const ids = new Set(issues.map((issue) => issue.id));
  for (const issue of issues) {
    for (const problem of issue.problems) at(issue, problem);
    const { data } = issue;
    if (!isEstimate(data.estimate)) at(issue, `${issueName(issue)} needs an estimate: a number of days from 0.5 in steps of 0.5`);
    for (const role of ["assignee", "reviewer"] as const) {
      const handle = data[role];
      if (handle !== null && team !== undefined && !team.has(handle.toLowerCase())) at(issue, `${issueName(issue)} has the ${role} @${handle}, who is not a member of the team`);
    }
    if (data.assignee !== null && data.reviewer !== null && data.assignee.toLowerCase() === data.reviewer.toLowerCase()) at(issue, `${issueName(issue)} has the same person, @${data.assignee}, as assignee and as reviewer`);
    for (const ref of data.refs) if (!resolves(ref)) at(issue, `${issueName(issue)} names ${ref}, which does not exist with the handoff applied`);
    for (const dependency of data.dependsOn) {
      if (dependency === issue.id) at(issue, `${issueName(issue)} depends on itself`);
      else if (!ids.has(dependency) && !required.has(dependency)) at(issue, `${issueName(issue)} depends on ${dependency}, which is neither an issue of this handoff nor of a handoff it requires`);
    }
  }
  const cycle = dependencyCycle(issues);
  if (cycle !== null) out.push({ file: "proposal.md", line: 0, message: `the dependencies of the issues make a cycle: ${cycle.join(" → ")}` });
  return out;
}

/** The warnings of the issues of a handoff, which refuse nothing: each estimate, the Manager's change applied, over `LONG_ISSUE_DAYS` days. */
export function handoffIssueWarnings(issues: readonly ProposalIssue[]): Diagnostic[] {
  return issues.flatMap((issue) => {
    const estimate = appliedFields(issue.data).estimate;
    return estimate !== null && estimate > LONG_ISSUE_DAYS ? [{ file: `issues/${issue.name}`, line: 0, message: `Estimated ${estimate} d: more than ${LONG_ISSUE_DAYS} days per issue` }] : [];
  });
}

/** What the Manager's change of a field is checked against; each part is null while it is not known, and then no value that needs it is accepted. */
export interface FieldRules {
  /** The GitHub handles of the team, in lower case, as the editor answered. */
  members: ReadonlySet<string> | null;
  /** The iterations of the linked Project, each with whether it has ended. */
  sprints: readonly { title: string; ended: boolean }[] | null;
  /** The other fields of the linked Project, by name: their kind and, for a single-select, the options. */
  fields: Readonly<Record<string, { kind: "single-select" | "number" | "text" | "other"; options?: readonly string[] }>> | null;
}

/** The longest text a text field of the Project takes. */
export const FIELD_TEXT_LIMIT = 1000;

function refuse(message: string): never {
  throw new TramaError(message);
}

/**
 * The `manager` mapping of an issue file once the Manager chose `value` for the field `key` (`rules#developer.CHANGE_ISSUE_FIELD`), or a refusal that changes nothing.
 * `assignee` and `reviewer` are a member of the team or none, never the same person; `estimate` a number from 0.5 in steps of 0.5; `sprint` an iteration that has not ended, or
 * none; a single-select field one of its options; a number field a number; a text field at most 1,000 characters. A value equal to the agent's removes the key: that is the undo.
 */
export function fieldChange(data: ProposalIssueData, key: string, value: ManagerValue, rules: FieldRules): Record<string, ManagerValue> {
  if (!isFieldKey(key)) refuse(`${JSON.stringify(key)} is not a field of an issue: use assignee, reviewer, estimate, sprint or fields.<name>`);
  const applied = appliedFields(data);
  const lower = (text: string | null): string | null => (text === null ? null : text.toLowerCase());
  let agent: ManagerValue;
  let chosen: ManagerValue = value;
  if (key === "assignee" || key === "reviewer") {
    agent = data[key];
    const handle = value === null ? "" : String(value).trim().replace(/^@/, "");
    chosen = handle === "" ? null : handle;
    if (chosen !== null) {
      const isAgents = lower(data[key]) === chosen.toLowerCase();
      if (!isAgents && (rules.members === null || !rules.members.has(chosen.toLowerCase()))) refuse("Choose a member of the team.");
      if (lower(key === "assignee" ? applied.reviewer : applied.assignee) === chosen.toLowerCase()) refuse("The assignee and the reviewer must be two different people.");
    }
  } else if (key === "estimate") {
    agent = data.estimate;
    if (!isEstimate(value)) refuse(ESTIMATE_PROBLEM);
  } else if (key === "sprint") {
    agent = data.sprint;
    chosen = value === null ? null : String(value);
    if (chosen !== null && chosen !== agent) {
      const sprint = rules.sprints?.find((s) => s.title === chosen);
      if (sprint === undefined || sprint.ended) refuse("Choose a sprint that has not ended.");
    }
  } else {
    const name = key.slice("fields.".length);
    agent = data.fields[name] ?? null;
    chosen = value === null ? null : String(value);
    if (chosen !== null && chosen !== agent) {
      const field = rules.fields?.[name];
      if (field === undefined) refuse(`${name} is not a field of the linked GitHub Project.`);
      if (field.kind === "single-select" && !(field.options ?? []).includes(chosen)) refuse(`Choose one of the options of ${name}.`);
      if (field.kind === "number" && !/^-?\d+(\.\d+)?$/.test(chosen.trim())) refuse(`Enter a number for ${name}.`);
      if (field.kind === "text" && chosen.length > FIELD_TEXT_LIMIT) refuse(`Use at most ${FIELD_TEXT_LIMIT.toLocaleString("en-US")} characters.`);
    }
  }
  const manager = { ...data.manager };
  const isUndo = key === "assignee" || key === "reviewer" ? lower(chosen === null ? null : String(chosen)) === lower(agent === null ? null : String(agent)) : chosen === agent;
  if (isUndo) delete manager[key];
  else manager[key] = chosen;
  return manager;
}

/**
 * The cards the approval of a handoff creates, one per issue file, in `.trama/issues/`: the same identity, title and body, the Manager's values applied, the label of the
 * handoff, `publishing`. `mint` gives the approval instant of each. Nothing is written; an issue whose card already exists refuses the approval.
 */
export function planApprovalIssues(p: Project, handoff: { id: string; label: string }, files: readonly ProposalIssue[], mint: () => string = createdNow): Issue[] {
  const dir = issuesDir(p);
  const taken = new Set(listCards(dir, "file").map((card) => card.id));
  return files.map((file) => {
    if (taken.has(file.id)) throw new TramaError(`The card of issue "${file.title}" cannot be created: .trama/issues/ already has an issue ${file.id}`);
    const name = `${file.id}-${slugify(file.title)}.md`;
    const { estimate, assignee, reviewer, sprint, fields } = appliedFields(file.data);
    return {
      id: file.id,
      name,
      path: join(dir, name),
      title: file.title,
      body: file.body,
      data: { handoff: handoff.id, label: handoff.label, refs: file.data.refs, estimate, assignee, reviewer, sprint, fields, dependsOn: file.data.dependsOn, created: mint(), state: "publishing", number: null, url: null, published: null, unset: [], reason: null, updated: null, texts: {}, agent: null },
    };
  });
}

/** Writes the cards `planApprovalIssues` planned. */
export function writeApprovalIssues(cards: readonly Issue[]): void {
  for (const card of cards) saveIssue(card);
}

/** What decides whether Split is available on an issue (`rules#developer.SPLIT_ISSUE`). */
export interface SplitFacts {
  /** The handoff's status. */
  status: string;
  /** The estimate of the issue, the Manager's change applied; null when it has none. */
  estimate: number | null;
  /** The agent that handed the handoff over has not finished its turn. */
  finishing: boolean;
  /** An agent is writing the handoff. */
  writing: boolean;
  /** A Run launched from this window is in progress. */
  running: boolean;
}

/**
 * Why Split is not available on an issue, or null when it is: only an issue estimated more than three days of an open handoff, and then, in this order, `The agent is still finishing`,
 * `The agent is writing this handoff`, `A run is in progress`.
 */
export function splitIssueBlock(facts: SplitFacts): string | null {
  if (facts.status !== "open" && facts.status !== "draft") return "Only an issue of an open handoff can be split";
  if (facts.estimate === null || facts.estimate <= LONG_ISSUE_DAYS) return `Only an issue estimated more than ${LONG_ISSUE_DAYS} days can be split`;
  if (facts.finishing) return "The agent is still finishing";
  if (facts.writing || facts.status === "draft") return "The agent is writing this handoff";
  if (facts.running) return "A run is in progress";
  return null;
}

/** The title of the announcement of a Replan, whose ghost is how Trama knows it runs (`rules#developer.REPLAN_HANDOFFS`). */
export const REPLANNING_TITLE = "Replanning handoffs";

/** The titles of the announcements of work with handoffs that do not write one: the publication of issues, their Comment update, an import and a Replan. */
const OTHER_WORK_TITLES = ["Publishing issues", "Importing from code", REPLANNING_TITLE];

/** Whether a Replan launched from this window runs: its announcement is live, from the launch until its agent ends its turn or its terminal or conversation closes. */
export function replanRunning(announcements: readonly { kind: string; title: string }[]): boolean {
  return announcements.some((announcement) => announcement.kind === "work" && announcement.title === REPLANNING_TITLE);
}

/**
 * Whether an agent writes a handoff: a live announcement of work that is none of the other jobs of the handoff skill (a handoff request, Rework with feedback or Split; the other
 * jobs are the publication, the Comment update `Updating #<n>`, an import and a Replan), which is live until its agent ends its turn.
 */
export function handoffBeingWritten(announcements: readonly { kind: string; title: string }[]): boolean {
  return announcements.some((announcement) => announcement.kind === "work" && !OTHER_WORK_TITLES.includes(announcement.title) && !/^Updating #\d+$/.test(announcement.title));
}

/** What decides whether Replan is available (`rules#developer.REPLAN_HANDOFFS`). */
export interface ReplanFacts {
  /** A GitHub Project is linked. */
  linked: boolean;
  /** The number of open handoffs, stale ones included, never a Draft. */
  open: number;
  /** The agent that handed an open handoff over has not finished its turn. */
  finishing: boolean;
  /** An agent is writing a handoff: a Draft one, or a handoff request, Split or Rework with feedback whose agent has not finished its turn. */
  writing: boolean;
  /** A Run launched from this window is in progress. */
  running: boolean;
  /** A Replan launched from this window is running. */
  replanning: boolean;
}

/**
 * Why Replan is not available, or null when it is: the first of, in this order, `Link a GitHub Project first`, `No handoff waits for a decision`, `The agent is still finishing`,
 * `An agent is writing a handoff`, `A run is in progress`, `Replan is already running`.
 */
export function replanHandoffsBlock(facts: ReplanFacts): string | null {
  if (!facts.linked) return LINK_PROJECT_FIRST;
  if (facts.open === 0) return "No handoff waits for a decision";
  if (facts.finishing) return "The agent is still finishing";
  if (facts.writing) return "An agent is writing a handoff";
  if (facts.running) return RUN_IN_PROGRESS;
  if (facts.replanning) return "Replan is already running";
  return null;
}
