import { existsSync, readdirSync, rmSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { withFileLock } from "./file-lock";
import { type AgentOrigin, type Announcement, bindDraft, removeBoundTo } from "./announcements";
import { consumeRequest, requestExists } from "./design-requests";
import { diffFile, type FileChange } from "./diff";
import { TramaError } from "./errors";
import { resolveRef } from "./refs";
import { formatDiagnostic } from "./model";
import { buildProject, largeFragmentMessage, largeFragments, lineageRefs, parseRequirementRef, type ProjectModel, REQUIREMENT_SKILLS_BUDGET, resolves } from "./requirements";
import { requirementSkillMode, syncRequirementSkills } from "./requirement-skills";
import { boolField, canonicalCardId, compareByCreation, createdField, enumField, idField, positiveIntOrNull, type Raw, stringList, stringMap, textOrNull } from "./schema";
import {
  createdNow,
  findCard,
  listCards,
  lockNameOf,
  newCardId,
  type Project,
  type Document,
  readDocument,
  readTracked,
  readTrackedFiles,
  REQUIREMENTS_PREFIX,
  sha256,
  slugify,
  trackedLocation,
  writeDocument,
  writeFileEnsuringDir,
} from "./store";
import type { Diagnostic, FileMap } from "./types";
import { appliesUnder, type RequiredProposal, requiredReasons } from "./required";
import { cardName, identityOfShortNumber, savedIdentityOfShortNumber, syncShortNumbers } from "./short-numbers";
import { isSpecsRef, SPECS_FILE } from "./specs";
import { attachedDrift, type DriftOutcome, fixCodeRefusal, listDrifts, listTasks, planApprovalTasks, requireNotAttached, resolveListedDrifts, writeApprovalTasks } from "./work";
import { IMAGE_EXTENSIONS, isImagePath, pruneTaskImages, removeTaskImage } from "./task-image-cleanup";
import { copyTaskImages, readTaskImages } from "./task-images";
import { removedElements, type RemovedKind, SCAN_REASONS, scanScope, type ScanScopeEntry } from "./scan-scope";
import { linkedGithubProject } from "./github";
import { fieldChange, type FieldRules, handoffIssueWarnings, handoffProblems, issuesDir, LINK_PROJECT_FIRST, listIssues, loadProposalIssues, type ManagerValue, planApprovalIssues, type ProposalIssue, type TeamRoster, writeApprovalIssues } from "./issues";
import { requireTeam, teamUnavailableReason } from "./manager-mode";

/**
 * `draft`: the agent is still writing it; only the agent hands it over and only the developer can discard it.
 * `open`: handed over, waiting for the developer. A file without a status is `open`.
 */
export type ProposalStatus = "draft" | "open" | "approved" | "rejected" | "discarded";

/**
 * `import`: written by the trama-import skill to describe existing code; approving it starts no Scan.
 * `resolution`: written by the agent run by Resolve Drifts; lists the open Drifts it resolves, each with the developer's decision. Like an import it starts no Scan.
 * `setup`: the first Proposal of a project whose Model is empty, written from a design request by the `trama-setup` skill; it is approved on hand-over when it is valid, not blocked and the Model is still empty.
 * `handoff`: the lighter Proposal through which the Manager gives work to the people of the team (only while Team is available): it may change the Model and the Requirements, holds issues instead of Tasks, and on approval creates the issue cards the agent publishes on GitHub.
 */
export type ProposalKind = "change" | "import" | "resolution" | "setup" | "handoff";

export type DriftDecisionKind = "proposal" | "dismissed" | "fix-code";

/** The decision taken on one Drift by a resolution Proposal; `option` and `note` go only with `fix-code`. */
export interface DriftDecision {
  drift: string;
  decision: DriftDecisionKind;
  option?: number;
  note?: string;
}

const DECISIONS: readonly DriftDecisionKind[] = ["proposal", "dismissed", "fix-code"];

interface ProposalData {
  status: ProposalStatus;
  kind: ProposalKind;
  /** A resolution born from the answer to a Drift's prepared question: it does not stop Resolve while it awaits a decision. Only valid with `kind: resolution`. */
  prepared: boolean;
  /** The Drifts a resolution resolves, in the order they were registered; always empty for other kinds. */
  drifts: DriftDecision[];
  /** IDs of Proposals that must be approved before this one; it is written and validated on top of them. */
  requires: string[];
  /** Tracked path -> sha256 of the file, or "new", when the Proposal first touched it (on top of `requires`). */
  base: Record<string, string>;
  delete: string[];
  /** The written design request the Proposal was born from; kept after the request is consumed. */
  request: string | null;
  /** When the Proposal was created, UTC ISO 8601. Absent on numbered Proposals written before the field existed. */
  created: string | null;
  /** History only: the scope an Approved Proposal saved before scope became live. Never written now. */
  scanScope: ScanScopeEntry[] | null;
  /** Short name shown on the Board and in `proposal show`; required before a Proposal with Tasks is handed over. Absent on Proposals written before the field existed. */
  label: string | null;
  /** The rejected Proposal this one redoes (Rework with feedback); kept after the decision. Absent elsewhere. */
  reworks: string | null;
  /** Set when the Proposal was rejected with Rework with feedback; absent elsewhere. */
  reworkRequested: boolean;
  /** Set by a rebase (`proposal edit` with `rebase`) and cleared by a successful hand-over: the Draft is being refined over the current Model. */
  refining: boolean;
}

/** Longest label a Proposal can carry, in characters. */
export const LABEL_LIMIT = 30;

/** Why `text` is not a usable label, or null: 1 to LABEL_LIMIT characters after trimming, on one line. */
export function labelProblem(text: string): string | null {
  const trimmed = text.trim();
  if (trimmed === "") return "the label is empty";
  if (/[\r\n]/.test(trimmed)) return "the label must be on one line";
  const length = [...trimmed].length;
  return length > LABEL_LIMIT ? `the label is ${length} characters long; at most ${LABEL_LIMIT} are allowed` : null;
}

/** The label as it is stored, after checking it; refuses the text with the reason. */
export function checkedLabel(text: string): string {
  const problem = labelProblem(text);
  if (problem !== null) throw new TramaError(`Refused: ${problem}. A label has 1 to ${LABEL_LIMIT} characters, on one line.`);
  return text.trim();
}

export interface Proposal {
  id: string;
  name: string;
  dir: string;
  data: ProposalData;
  body: string;
  title: string;
  /** The Tasks this ordinary Proposal holds, one file each under `tasks/`; they are not tracked files, so they never make it stale. */
  tasks: ProposalTask[];
  /** The issues this handoff holds, one file each under `issues/`; never in a Proposal of another kind. They are not tracked files, so they never make it stale. */
  issues: ProposalIssue[];
}

/**
 * A Task written inside a Proposal (`tasks/<identity>-<slug>.md`). `problems` are what validation reports for the file:
 * fields other than `technical` and `refs`, a missing title, unreadable front matter. They do not stop the Proposal from loading.
 */
export interface ProposalTask {
  id: string;
  name: string;
  title: string;
  technical: boolean;
  refs: string[];
  body: string;
  problems: string[];
}

const proposalsDir = (p: Project) => join(p.dir, "proposals");

const STATUSES: readonly ProposalStatus[] = ["draft", "open", "approved", "rejected", "discarded"];
const KINDS: readonly ProposalKind[] = ["change", "import", "resolution", "setup", "handoff"];

function parseData(raw: Raw, where: string): ProposalData {
  const data: ProposalData = {
    status: enumField(raw, "status", STATUSES, "open", where),
    kind: enumField(raw, "kind", KINDS, "change", where),
    prepared: boolField(raw, "prepared", false, where),
    drifts: [],
    requires: stringList(raw, "requires", where),
    base: stringMap(raw, "base", where),
    delete: stringList(raw, "delete", where),
    request: textOrNull(raw, "request", where),
    created: createdField(raw, where),
    scanScope: scanScopeField(raw, where),
    label: textOrNull(raw, "label", where),
    reworks: idField(raw, "reworks", where),
    reworkRequested: boolField(raw, "reworkRequested", false, where),
    refining: boolField(raw, "refining", false, where),
  };
  if (data.reworks !== null && data.request !== null) throw new TramaError(`${where}: a Proposal with "reworks" has no "request"`);
  data.drifts = driftsField(raw, data.kind, where);
  for (const id of data.requires)
    if (!/^[a-z0-9]{8}$/.test(id) && !/^\d+$/.test(id)) throw new TramaError(`${where}: "requires" lists Proposal IDs, not "${id}"`);
  for (const path of [...Object.keys(data.base), ...data.delete]) {
    try {
      normalizeModelPath(path, false);
    } catch (err) {
      throw new TramaError(`${where}: ${(err as Error).message}`);
    }
  }
  return data;
}

function driftsField(raw: Raw, kind: ProposalKind, where: string): DriftDecision[] {
  const v = raw["drifts"];
  if (v === undefined || v === null) return [];
  if (kind !== "resolution") throw new TramaError(`${where}: only a resolution Proposal has "drifts"`);
  const bad = `${where}: "drifts" must be a list of { drift, decision, option?, note? } with decision one of ${DECISIONS.join(", ")}`;
  if (!Array.isArray(v)) throw new TramaError(bad);
  const out = v.map((e): DriftDecision => {
    const drift = idField(e ?? {}, "drift", where);
    if (drift === null || !DECISIONS.includes(e.decision)) throw new TramaError(bad);
    const option = positiveIntOrNull(e, "option", where);
    const note = textOrNull(e, "note", where);
    return { drift, decision: e.decision, ...(option === null ? {} : { option }), ...(note === null ? {} : { note }) };
  });
  if (new Set(out.map((e) => e.drift)).size !== out.length) throw new TramaError(`${where}: "drifts" lists a Drift more than once`);
  return out;
}

function scanScopeField(raw: Raw, where: string): ScanScopeEntry[] | null {
  const v = raw["scanScope"];
  if (v === undefined || v === null) return null;
  if (!Array.isArray(v) || v.some((e) => typeof e?.ref !== "string" || !SCAN_REASONS.includes(e.reason)))
    throw new TramaError(`${where}: "scanScope" must be a list of { ref, reason } with reason one of ${SCAN_REASONS.join(", ")}`);
  return v.map((e) => ({ ref: e.ref, reason: e.reason }));
}

/** The Task files under a Proposal folder's `tasks/`, by name. A file that cannot be read is kept with its problem, so the Proposal still loads. */
function loadTasks(dir: string): ProposalTask[] {
  const folder = join(dir, "tasks");
  if (!existsSync(folder)) return [];
  return readdirSync(folder)
    .filter((name) => name.endsWith(".md"))
    .sort()
    .map((name) => parseProposalTask(join(folder, name), name));
}

function parseProposalTask(file: string, name: string): ProposalTask {
  const id = /^([a-z0-9]{8})-.+\.md$/.exec(name)?.[1] ?? "";
  const blank = { id, name, title: "", technical: false, refs: [] as string[], body: "" };
  if (!id) return { ...blank, problems: ["the file name must be <identity>-<slug>.md"] };
  let doc: Document;
  try {
    doc = readDocument(file);
  } catch (err) {
    return { ...blank, problems: [(err as Error).message] };
  }
  const problems = Object.keys(doc.data)
    .filter((key) => key !== "technical" && key !== "refs")
    .map((key) => `field "${key}" is not allowed in a Task file (only technical and refs)`);
  const technical = doc.data["technical"] ?? false;
  if (typeof technical !== "boolean") problems.push(`"technical" must be true or false`);
  const refs = doc.data["refs"] ?? [];
  if (!Array.isArray(refs) || refs.some((r) => typeof r !== "string")) problems.push(`"refs" must be a list of references`);
  const title = /^#\s+(.+)$/m.exec(doc.body)?.[1]?.trim() ?? "";
  if (title === "") problems.push("the Task has no H1 title");
  return {
    id,
    name,
    title,
    technical: technical === true,
    refs: Array.isArray(refs) ? refs.filter((r): r is string => typeof r === "string") : [],
    body: doc.body,
    problems,
  };
}

function load(p: Project, entry: { id: string; name: string }): Proposal {
  const dir = join(proposalsDir(p), entry.name);
  const file = join(dir, "proposal.md");
  const doc = readDocument(file);
  const title = /^#\s+(.+)$/m.exec(doc.body)?.[1]?.trim() ?? entry.name;
  return { id: entry.id, name: entry.name, dir, body: doc.body, title, data: parseData(doc.data, file), tasks: loadTasks(dir), issues: loadProposalIssues(dir) };
}

/** Writes `proposal.md` from the Proposal's data, leaving defaults out of the file. */
export function save(proposal: Proposal) {
  const { kind, prepared, drifts, requires, request, created, scanScope, label, reworks, reworkRequested, refining, ...rest } = proposal.data;
  // Defaults stay out of the file, so Proposals without dependencies look as they always did.
  // Numbered Proposals have no `created`; writing it would pretend they remember an instant they do not.
  const data = {
    status: rest.status,
    ...(kind === "change" ? {} : { kind }),
    ...(prepared ? { prepared: true } : {}),
    ...(kind === "resolution" ? { drifts } : {}),
    ...(requires.length === 0 ? {} : { requires }),
    base: rest.base,
    delete: rest.delete,
    ...(request === null ? {} : { request }),
    ...(created === null ? {} : { created }),
    ...(scanScope === null ? {} : { scanScope }),
    ...(label === null ? {} : { label }),
    ...(reworks === null ? {} : { reworks }),
    ...(reworkRequested ? { reworkRequested: true } : {}),
    ...(refining ? { refining: true } : {}),
  };
  writeDocument(join(proposal.dir, "proposal.md"), data, proposal.body);
}

export function listProposals(p: Project): Proposal[] {
  return listCards(proposalsDir(p), "folder")
    .map((e) => load(p, e))
    .sort((a, b) => compareByCreation({ id: a.id, created: a.data.created }, { id: b.id, created: b.data.created }));
}


/**
 * The Proposal `id` names. `asArgument` applies the command rules: digits cite only a numbered Proposal, and a short
 * number (`P3`) cites the live Proposal that has it.
 */
export function getProposal(p: Project, id: string, asArgument = false): Proposal {
  const cited = asArgument ? identityOfShortNumber(p, "proposal", id) : null;
  return load(p, findCard(proposalsDir(p), cited ?? id, "Proposal", "folder", asArgument && cited === null));
}

export function newProposal(
  p: Project,
  title: string,
  body = "",
  options: { requires?: string[]; kind?: ProposalKind; prepared?: boolean; announcement?: string; origin?: AgentOrigin; request?: string; label?: string; reworks?: string } = {},
): Proposal {
  return createProposal(p, title, body, options).proposal;
}

/** What binding a new Proposal to the rejected one it redoes did: the Proposals whose `requires` changed, or why nothing was bound. */
export interface ReworkOutcome {
  /** Identity of the rejected Proposal now bound, or null. */
  reworks: string | null;
  /** Why the Proposal was created without the link; empty when it was bound or none was asked. */
  note: string;
  /** Draft or open Proposals whose `requires` now names the new Proposal instead of the rejected one. */
  changed: string[];
}

/** `newProposal` plus the outcome of the link to a rejected Proposal (`reworks`), made in the same step under the rejected Proposal's lock. */
export function createProposal(
  p: Project,
  title: string,
  body = "",
  options: { requires?: string[]; kind?: ProposalKind; prepared?: boolean; announcement?: string; origin?: AgentOrigin; request?: string; label?: string; reworks?: string } = {},
): { proposal: Proposal; rework: ReworkOutcome } {
  if (options.reworks !== undefined && options.request !== undefined)
    throw new TramaError("Refused: a Proposal that reworks another cannot be bound to a design request; give reworks or request, not both");
  if (options.prepared && (options.kind ?? "change") !== "resolution")
    throw new TramaError("prepared needs a resolution");
  // A handoff is refused, creating nothing, when Team is not available (`rules#proposal/Draft`).
  if (options.kind === "handoff") requireTeam(p);
  const label = options.label === undefined ? null : checkedLabel(options.label);
  const requires = (options.requires ?? []).map((r) => {
    const required = getProposal(p, r);
    if (required.data.status === "rejected" || required.data.status === "discarded")
      throw new TramaError(`Proposal ${cardName(p, "proposal", required.id)} was ${required.data.status}; a new Proposal cannot require it`);
    return required.id;
  });
  const citing = options.reworks;
  let target: Proposal | null = null;
  if (citing !== undefined) {
    try {
      target = getProposal(p, citing);
    } catch {
      target = null;
    }
  }
  const none = (note: string): ReworkOutcome => ({ reworks: null, note, changed: [] });
  const make = (rework: Proposal | null): { proposal: Proposal; rework: ReworkOutcome } => {
    const id = newCardId(proposalsDir(p), "folder", "Proposal");
    const name = `${id}-${slugify(title)}`;
    const proposal: Proposal = {
      id,
      name,
      dir: join(proposalsDir(p), name),
      title,
      data: {
        status: "draft",
        kind: options.kind ?? "change",
        prepared: options.prepared ?? false,
        drifts: [],
        requires: [...new Set(requires)],
        base: {},
        delete: [],
        // Only the first Proposal opened for a request binds it; a request that does not exist binds nothing.
        request: requestToBind(p, options.request),
        // A Proposal that redoes a rejected one takes its place: same instant (absent when the rejected one has none).
        created: rework === null ? createdNow() : rework.data.created,
        scanScope: null,
        label,
        reworks: rework === null ? null : rework.id,
        reworkRequested: false,
        refining: false,
      },
      body: `# ${title}\n\n${body.trim()}\n`.replace(/\n\n\n$/, "\n"),
      tasks: [],
      issues: [],
    };
    save(proposal);
    const changed = rework === null ? [] : rewriteRequires(p, rework.id, proposal.id);
    bindDraft(p, proposal, options.announcement, options.origin);
    return { proposal, rework: { reworks: rework?.id ?? null, note: "", changed } };
  };
  if (citing === undefined) return make(null);
  if (target === null) {
    const created = make(null);
    created.rework = none(`Proposal ${citing} was not found; the Proposal does not redo any Proposal.`);
    return created;
  }
  // The rejected Proposal's lock makes two agents redoing it at once bind it only once.
  return withProposalLock(p, target.id, () => {
    const current = getProposal(p, target!.id);
    const name = cardName(p, "proposal", current.id);
    const problem =
      current.data.status !== "rejected"
        ? `Proposal ${name} is ${current.data.status}, not rejected; the Proposal does not redo it.`
        : listProposals(p).some((x) => x.data.reworks === current.id)
          ? `Proposal ${name} is already redone by another Proposal; the Proposal does not redo it.`
          : "";
    if (problem !== "") {
      const created = make(null);
      created.rework = none(problem);
      return created;
    }
    return make(current);
  });
}

/** Replaces `from` with `to` in the `requires` of every draft or open Proposal, each rewritten under its own lock; returns the ones changed. */
function rewriteRequires(p: Project, from: string, to: string): string[] {
  const changed: string[] = [];
  for (const other of listProposals(p)) {
    if (other.id === to || (other.data.status !== "draft" && other.data.status !== "open")) continue;
    if (!other.data.requires.some((r) => canonicalCardId(r) === from)) continue;
    withProposalLock(p, other.id, () => {
      const fresh = getProposal(p, other.id);
      if (!fresh.data.requires.some((r) => canonicalCardId(r) === from)) return;
      fresh.data.requires = [...new Set(fresh.data.requires.map((r) => (canonicalCardId(r) === from ? to : r)))];
      save(fresh);
      changed.push(fresh.id);
    });
  }
  return changed;
}

function requestToBind(p: Project, request: string | undefined): string | null {
  if (request === undefined || !requestExists(p, request)) return null;
  return listProposals(p).some((x) => x.data.request === request) ? null : request;
}


/**
 * Every Proposal this one requires, directly or through others, that is not approved yet, in the order they
 * apply (each after the ones it requires).
 */
export function requiredProposals(p: Project, proposal: Proposal): RequiredProposal[] {
  const out: RequiredProposal[] = [];
  /** Proposals already explored; a cycle is a back edge to the current path, tracked apart so it is never hidden by `done`. */
  const done = new Set<string>();
  const cycles = new Set<string>();
  const visit = (current: Proposal, path: string[]) => {
    for (const raw of current.data.requires) {
      const id = canonicalCardId(raw);
      if (path.includes(id)) {
        if (!cycles.has(id)) out.push({ id, title: "", status: "cycle" });
        cycles.add(id);
        continue;
      }
      if (done.has(id)) continue;
      done.add(id);
      let required: Proposal;
      try {
        required = getProposal(p, id);
      } catch {
        out.push({ id, title: "", status: "missing" });
        continue;
      }
      if (required.data.status === "approved") continue;
      visit(required, [...path, id]);
      out.push({ id: required.id, title: required.title, status: required.data.status as Exclude<RequiredProposal["status"], "missing" | "cycle"> });
    }
  };
  visit(proposal, [proposal.id]);
  return out;
}

/** The tracked files the Proposal is written on: the current ones with the open Proposals it requires applied. */
export function baseFiles(p: Project, proposal: Proposal): FileMap {
  const files = readTrackedFiles(p);
  for (const r of requiredProposals(p, proposal)) {
    if (!appliesUnder(r.status)) continue;
    const required = getProposal(p, r.id);
    for (const path of required.data.delete) files.delete(path);
    for (const [path, content] of newFiles(required)) files.set(path, content);
  }
  return files;
}

/**
 * A tracked path: `specs.yaml` for the Specs, `checkout/order.md` for the Model, `requirements/ui/area.md` or `requirements/ui/<fragment>.md` for
 * Requirements. `areaFolders` is false for paths a Proposal already recorded: those written before Areas became
 * folders (`requirements/ui.md`) stay readable as history; only a new registration must use the folder layout.
 */
function normalizeModelPath(path: string, areaFolders = true): string {
  const clean = path.replace(/\\/g, "/").replace(/^\.\//, "").replace(/^\.trama\/model\//, "").replace(/^\.trama\/requirements\//, REQUIREMENTS_PREFIX);
  if (clean === SPECS_FILE) return clean;
  const expected = "requirements/<area>/area.md or requirements/<area>/<fragment>.md";
  if (!clean.endsWith(".md")) throw new TramaError(`"${path}" is not a Model or Requirement file (expected a .md path under .trama/model/, or ${expected})`);
  if (clean.split("/").includes("..") || clean.startsWith("/")) throw new TramaError(`"${path}" must be relative to .trama/model/, or be ${expected}`);
  if (areaFolders && clean.startsWith(REQUIREMENTS_PREFIX)) {
    const depth = clean.slice(REQUIREMENTS_PREFIX.length).split("/").length;
    if (depth === 1) throw new TramaError(`"${path}": Requirement Areas are folders now; write ${expected}`);
    if (depth > 2) throw new TramaError(`"${path}": an Area has no subfolders; write ${expected}`);
  }
  return clean;
}

/** The refusal for a Draft that `action` needs handed over: the developer meets it as «not ready yet». */
export const stillBeingWritten = (p: Project, proposal: Proposal, action: string) =>
  `Proposal ${cardName(p, "proposal", proposal.id)} is still being written: the agent has not handed it over, so it cannot be ${action} yet`;

/** Refuses unless the Proposal is in `status`; a Draft gets its own message, because the developer meets it as "not ready yet". */
function requireStatus(p: Project, proposal: Proposal, status: "draft" | "open", action: string) {
  if (proposal.data.status === status) return;
  if (proposal.data.status === "draft") throw new TramaError(stillBeingWritten(p, proposal, action));
  throw new TramaError(`Proposal ${cardName(p, "proposal", proposal.id)} is ${proposal.data.status}; only ${status === "draft" ? "a Draft" : "open Proposals"} can be ${action}`);
}

export function requireEditable(p: Project, proposal: Proposal) {
  if (proposal.data.status !== "draft" && proposal.data.status !== "open")
    throw new TramaError(`Proposal ${cardName(p, "proposal", proposal.id)} is ${proposal.data.status}; only drafts and open Proposals can be edited`);
}

/**
 * Writes or changes the label of a Proposal. It is an edit: an open Proposal returns to Draft, and the result says so.
 */
export function setProposalLabel(p: Project, id: string, text: string): { proposal: Proposal; returnedToDraft: boolean } {
  const label = checkedLabel(text);
  return withProposalLock(p, id, () => {
    const proposal = getProposal(p, id);
    requireEditable(p, proposal);
    const returnedToDraft = proposal.data.status === "open";
    touch(proposal);
    proposal.data.label = label;
    save(proposal);
    return { proposal, returnedToDraft };
  });
}

/** An edit takes a handed-over Proposal back from the developer: it is a Draft until the next submit. */
export function touch(proposal: Proposal) {
  if (proposal.data.status === "open") proposal.data.status = "draft";
}

/**
 * Runs `fn` holding the write lock of the Proposal `citing` names, so the registrations on one Proposal, from several
 * processes, run one after the other: each reads what the previous one saved. The lock is named from the Proposal's
 * folder name, and a short number is resolved from the saved numbers, so no file of the Proposal is read before the lock
 * is held; `fn` receives the identity, resolved under the lock. Under the lock, a short number must still name the same
 * live Proposal, or nothing runs. `asArgument` applies the rules of a command argument, as `getProposal` does.
 */
export function withProposalLock<T>(p: Project, citing: string, fn: (id: string) => T, asArgument = false): T {
  const dir = proposalsDir(p);
  const cited = asArgument ? savedIdentityOfShortNumber(p, "proposal", citing) : null;
  const query = cited?.id ?? citing;
  const byArgument = asArgument && cited === null;
  return withFileLock(join(dir, ".locks"), lockNameOf(dir, query, "Proposal"), () => {
    if (cited !== null && syncShortNumbers(p).label("proposal", cited.id) !== cited.label)
      throw new TramaError(`${cited.label} no longer names a live Proposal: its number changed while the command waited for the lock. Nothing was written; run the command again.`);
    return fn(findCard(dir, query, "Proposal", "folder", byArgument).id);
  });
}

/**
 * Makes `modelPath` editable inside the Proposal and returns the file to edit.
 * Calling it again for the same file keeps what was recorded for it, but still returns an open Proposal to Draft.
 * A file already in the Proposal but never registered gets its starting version recorded, its content untouched.
 */
export function editInProposal(p: Project, id: string, modelPath: string): string {
  return withProposalLock(p, id, () => {
    if (modelPath.startsWith("tasks/")) return editTaskInProposal(p, id, modelPath);
    if (modelPath.startsWith("issues/")) return editIssueInProposal(p, id, modelPath);
    const proposal = getProposal(p, id);
    requireEditable(p, proposal);
    const rel = normalizeModelPath(modelPath);
    const target = trackedLocation(proposal.dir, rel);
    if (proposal.data.delete.includes(rel)) throw new TramaError(`${rel} is marked for deletion in Proposal ${cardName(p, "proposal", proposal.id)}`);
    touch(proposal);
    const exists = existsSync(target);
    if (!exists || proposal.data.base[rel] === undefined) {
      const content = baseFiles(p, proposal).get(rel);
      proposal.data.base[rel] ??= content !== undefined ? sha256(content) : "new";
      if (!exists) writeFileEnsuringDir(target, content ?? "");
    }
    save(proposal);
    return target;
  });
}

/**
 * Records again the starting version of every file the Proposal holds, computed on top of the Proposals it requires, so it is
 * no longer stale; this is the one exception to what `editInProposal` keeps. Marks it `refining`, and an open Proposal returns
 * to Draft. Refused, changing nothing, unless it is an ordinary change Proposal not attached to a Drift, and a Draft or open.
 */
export function rebaseInProposal(p: Project, id: string): Proposal {
  return withProposalLock(p, id, () => {
    const proposal = getProposal(p, id);
    const name = cardName(p, "proposal", proposal.id);
    if (proposal.data.kind !== "change") throw new TramaError(`Proposal ${name} is of kind ${proposal.data.kind}; only a change Proposal can be rebased`);
    const attached = attachedDrift(p, proposal.id);
    if (attached !== null) throw new TramaError(`Proposal ${name} is attached to Drift ${cardName(p, "drift", attached.id)}: decide it on the Drift`);
    if (proposal.data.status !== "draft" && proposal.data.status !== "open") throw new TramaError(`Proposal ${name} is ${proposal.data.status}; only a Draft or an open Proposal can be rebased`);
    const files = baseFiles(p, proposal);
    for (const path of [...newFiles(proposal).keys(), ...proposal.data.delete]) {
      const content = files.get(path);
      proposal.data.base[path] = content !== undefined ? sha256(content) : "new";
    }
    touch(proposal);
    proposal.data.refining = true;
    save(proposal);
    return proposal;
  });
}

export function deleteInProposal(p: Project, id: string, modelPath: string) {
  return withProposalLock(p, id, () => {
    if (modelPath.startsWith("tasks/")) return deleteTaskInProposal(p, id, modelPath);
    if (modelPath.startsWith("issues/")) return deleteIssueInProposal(p, id, modelPath);
    const proposal = getProposal(p, id);
    requireEditable(p, proposal);
    const rel = normalizeModelPath(modelPath);
    const content = baseFiles(p, proposal).get(rel);
    if (content === undefined) throw new TramaError(`${rel} does not exist in the Model, its Requirements or the Specs`);
    if (existsSync(trackedLocation(proposal.dir, rel)))
      throw new TramaError(`${rel} is already edited in Proposal ${cardName(p, "proposal", proposal.id)}; remove that copy first`);
    touch(proposal);
    proposal.data.base[rel] ??= sha256(content);
    if (!proposal.data.delete.includes(rel)) proposal.data.delete.push(rel);
    save(proposal);
  });
}

/**
 * Copies the files of Proposal `sourceId` (Model, Requirements, Specs and the paths it deletes) into Proposal `id`, recording
 * each starting version as `editInProposal` and `deleteInProposal` do, and returns an open Proposal to Draft. Refused, changing
 * nothing, when the source no longer applies to the files as they are now (a file it touches changed since it recorded it).
 */
export function copyProposalFiles(p: Project, id: string, sourceId: string): Proposal {
  return withProposalLock(p, id, () => {
    const proposal = getProposal(p, id);
    requireEditable(p, proposal);
    const source = getProposal(p, sourceId);
    const sourceName = cardName(p, "proposal", source.id);
    const { stale } = health(p, source);
    if (stale.length > 0) throw new TramaError(`Proposal ${sourceName} no longer applies: the Model changed since it touched ${stale.join(", ")}`);
    const files = baseFiles(p, proposal);
    for (const path of source.data.delete)
      if (!files.has(path)) throw new TramaError(`Proposal ${sourceName} deletes ${path}, which does not exist any more`);
    touch(proposal);
    for (const [path, content] of newFiles(source)) {
      const current = files.get(path);
      proposal.data.base[path] ??= current !== undefined ? sha256(current) : "new";
      writeFileEnsuringDir(trackedLocation(proposal.dir, path), content);
    }
    for (const path of source.data.delete) {
      const current = files.get(path) as string;
      proposal.data.base[path] ??= sha256(current);
      if (!proposal.data.delete.includes(path)) proposal.data.delete.push(path);
    }
    save(proposal);
    return proposal;
  });
}

/** Whether a Proposal of this kind has a scope: its Tasks, its removal Tasks and its Scan scope are computed. */
export const coversScope = (kind: ProposalKind): boolean => kind === "change" || kind === "setup";

/** The reason a Proposal that cannot hold Tasks gives, both when a Task file is refused and when validation reports it. */
const noTasksReason = (proposal: Proposal): string => (proposal.data.kind === "handoff" ? "a handoff holds issues in issues/, not Tasks" : "only a change or setup Proposal, not attached to a Drift, can hold Tasks");

/** Only a change or setup Proposal, not attached to a Drift, holds Tasks. */
function holdsTasks(p: Project, proposal: Proposal): boolean {
  return coversScope(proposal.data.kind) && attachedDrift(p, proposal.id) === null;
}

/** The file name a `tasks/<name>.md` path gives; anything deeper or not Markdown is refused. */
function taskFileName(path: string): string {
  const name = path.slice("tasks/".length);
  if (!/^[^/]+\.md$/.test(name)) throw new TramaError(`"${path}": a Task of a Proposal is tasks/<name>.md, one file in its tasks folder`);
  return name;
}

/**
 * Writes a Task of the Proposal and returns its file. A name that is already a Task file of the Proposal (the full name printed
 * before, `<identity>-<slug>.md`) rewrites that Task; any other name creates a new Task file, empty for the agent to fill, under
 * an identity no Task or Proposal Task has.
 */
function editTaskInProposal(p: Project, id: string, path: string): string {
  const proposal = getProposal(p, id);
  requireEditable(p, proposal);
  if (!holdsTasks(p, proposal)) throw new TramaError(noTasksReason(proposal));
  const name = taskFileName(path);
  const folder = join(proposal.dir, "tasks");
  let target = join(folder, name);
  if (!existsSync(target)) {
    const taskId = newCardId(cardIdFolders(p), "file", "Task");
    target = join(folder, `${taskId}-${slugify(name.slice(0, -".md".length))}.md`);
    writeDocument(target, { refs: [], technical: false }, "");
  }
  touch(proposal);
  save(proposal);
  return target;
}

/** Takes a Task file out of the Proposal. */
function deleteTaskInProposal(p: Project, id: string, path: string) {
  const proposal = getProposal(p, id);
  requireEditable(p, proposal);
  const target = join(proposal.dir, "tasks", taskFileName(path));
  if (!existsSync(target)) throw new TramaError(`${path} is not a Task file of Proposal ${cardName(p, "proposal", proposal.id)}`);
  touch(proposal);
  rmSync(target);
  save(proposal);
  pruneImages(p);
}

/** Every folder whose files are cards with an identity of the Tasks' and issues' shared space: `.trama/tasks`, `.trama/issues` and the `tasks/` and `issues/` of every Proposal (`data#issue`). */
function cardIdFolders(p: Project): string[] {
  const folders = listCards(proposalsDir(p), "folder").flatMap((e) => [join(proposalsDir(p), e.name, "tasks"), join(proposalsDir(p), e.name, "issues")]);
  return [join(p.dir, "tasks"), issuesDir(p), ...folders];
}

/** The file name an `issues/<name>.md` path gives; anything deeper or not Markdown is refused. */
function issueFileName(path: string): string {
  const name = path.slice("issues/".length);
  if (!/^[^/]+\.md$/.test(name)) throw new TramaError(`"${path}": an issue of a handoff is issues/<name>.md, one file in its issues folder`);
  return name;
}

/** Only a handoff holds issues. */
function requireHandoff(p: Project, proposal: Proposal): void {
  if (proposal.data.kind !== "handoff") throw new TramaError(`Proposal ${cardName(p, "proposal", proposal.id)} is not a handoff: only a handoff holds issues in issues/`);
}

/**
 * Writes an issue of the handoff and returns its file. A name that is already an issue file of the handoff (the full name printed before, `<identity>-<slug>.md`) rewrites
 * that issue; any other name creates a new issue file, empty for the agent to fill, under an identity no Task, issue or Proposal file has. An edit: an open handoff
 * returns to Draft. The Manager's values (`manager`) are never written here.
 */
function editIssueInProposal(p: Project, id: string, path: string): string {
  const proposal = getProposal(p, id);
  requireEditable(p, proposal);
  requireHandoff(p, proposal);
  const name = issueFileName(path);
  const folder = join(proposal.dir, "issues");
  let target = join(folder, name);
  if (!existsSync(target)) {
    const issueId = newCardId(cardIdFolders(p), "file", "issue");
    target = join(folder, `${issueId}-${slugify(name.slice(0, -".md".length))}.md`);
    writeDocument(target, { refs: [] }, "");
  }
  touch(proposal);
  save(proposal);
  return target;
}

/** Takes an issue file out of the handoff. */
function deleteIssueInProposal(p: Project, id: string, path: string): void {
  const proposal = getProposal(p, id);
  requireEditable(p, proposal);
  requireHandoff(p, proposal);
  const target = join(proposal.dir, "issues", issueFileName(path));
  if (!existsSync(target)) throw new TramaError(`${path} is not an issue file of Proposal ${cardName(p, "proposal", proposal.id)}`);
  touch(proposal);
  rmSync(target);
  save(proposal);
}

/** Deletes the image folders of the Tasks that must no longer keep them (`task-image-cleanup`), from the cards as they are now. */
export function pruneImages(p: Project): void {
  pruneTaskImages(p, listProposals(p), listTasks(p));
}

/** The Task of `proposal` named by its full name `tasks/<identity>-<slug>.md` or by its identity, or a refusal. */
function imageTaskOf(p: Project, proposal: Proposal, cited: string): ProposalTask {
  const file = cited.startsWith("tasks/") ? cited.slice("tasks/".length) : cited;
  const found = proposal.tasks.find((t) => t.name === file || t.id === file);
  if (!found) throw new TramaError(`${cited} is not a Task of Proposal ${cardName(p, "proposal", proposal.id)}`);
  return found;
}

/**
 * Ties images to Tasks of the Proposal and takes copies away; an edit, so an open Proposal returns to Draft. Everything
 * is checked first (Task of the Proposal, file exists and is a regular file, image extension, copy to take away exists):
 * a refusal changes nothing. Returns the path of each copy made, in order.
 */
export function changeTaskImages(p: Project, id: string, add: { task: string; path: string }[], remove: { task: string; name: string }[]): string[] {
  return withProposalLock(p, id, () => {
    const proposal = getProposal(p, id);
    requireEditable(p, proposal);
    const copies = add.map((e) => {
      const task = imageTaskOf(p, proposal, e.task);
      if (!isImagePath(e.path)) throw new TramaError(`${e.path} is not an image: only ${IMAGE_EXTENSIONS.join(", ")} files can be tied to a Task`);
      const source = resolve(p.root, e.path);
      if (!existsSync(source) || !statSync(source).isFile()) throw new TramaError(`${e.path} does not exist or is not a file`);
      return { task, source };
    });
    const removals = remove.map((e) => {
      const task = imageTaskOf(p, proposal, e.task);
      if (!readTaskImages(p, task.id).some((img) => img.name === e.name)) throw new TramaError(`Task ${task.id} has no image named ${e.name}`);
      return { task, name: e.name };
    });
    touch(proposal);
    save(proposal);
    for (const r of removals) removeTaskImage(p, r.task.id, r.name);
    return copies.flatMap((c) => copyTaskImages(p, c.task.id, [c.source]).map((img) => img.path));
  });
}

export interface ProposalHealth {
  /** Touched files whose version changed since the Proposal recorded it (on top of the Proposals it requires). */
  stale: string[];
  /** Files in the Proposal with no recorded base; `proposal edit` records it. */
  unbased: string[];
  /** Required Proposals not approved yet: while any is listed, this one cannot be approved. */
  requires: RequiredProposal[];
}

const newFiles = (proposal: Proposal): FileMap => readTracked(proposal.dir);

/** The tracked files the Proposal touches: those it holds in its folder and those it deletes. `health` checks each against its recorded base. */
export function touchedFiles(proposal: Proposal): Set<string> {
  return new Set([...newFiles(proposal).keys(), ...proposal.data.delete]);
}

export function health(p: Project, proposal: Proposal): ProposalHealth {
  const base = baseFiles(p, proposal);
  const touched = touchedFiles(proposal);
  const stale: string[] = [];
  const unbased: string[] = [];
  for (const path of touched) {
    const recorded = proposal.data.base[path];
    if (recorded === undefined) {
      unbased.push(path);
      continue;
    }
    const now = base.get(path);
    const changed = recorded === "new" ? now !== undefined : now === undefined || sha256(now) !== recorded;
    if (changed) stale.push(path);
  }
  return { stale: stale.sort(), unbased: unbased.sort(), requires: requiredProposals(p, proposal) };
}

/** The Model and Requirement files (tracked paths) as they would be once the Proposal, and those it requires, are applied. */
export function applied(p: Project, proposal: Proposal): FileMap {
  const files = baseFiles(p, proposal);
  for (const path of proposal.data.delete) files.delete(path);
  for (const [path, content] of newFiles(proposal)) files.set(path, content);
  return files;
}

/**
 * The errors of a Proposal with it applied. `team` (the lower-case GitHub handles of the team) is given only by the hand-over of a handoff, which also checks that the
 * assignee and the reviewer of each issue are members.
 */
export function validateProposal(p: Project, proposal: Proposal, team?: ReadonlySet<string>): Diagnostic[] {
  const taskErrors = proposal.tasks.flatMap((t) => t.problems.map((message) => ({ file: `tasks/${t.name}`, line: 0, message })));
  const project = buildProject(applied(p, proposal));
  return [...taskErrors, ...project.diagnostics, ...taskRules(p, proposal, project, team), ...labelRule(p, proposal), ...preparedRule(proposal)];
}

/**
 * A Proposal with Tasks needs a valid label to be handed over. An open Proposal without a label was handed over before
 * labels existed, so only a label that is present but invalid blocks it.
 */
/** `prepared` marks a resolution born from the answer to a prepared question; any other kind is a mistake. */
function preparedRule(proposal: Proposal): Diagnostic[] {
  if (!proposal.data.prepared || proposal.data.kind === "resolution") return [];
  return [{ file: "proposal.md", line: 0, message: "prepared is only valid for a resolution Proposal" }];
}

function labelRule(p: Project, proposal: Proposal): Diagnostic[] {
  if (proposal.data.kind === "handoff") {
    const { label } = proposal.data;
    const problem = label === null ? "it has none" : labelProblem(label);
    return problem === null ? [] : [{ file: "proposal.md", line: 0, message: `Proposal ${cardName(p, "proposal", proposal.id)} needs a label of at most ${LABEL_LIMIT} characters, on one line, for its epic: ${problem}` }];
  }
  if (proposal.tasks.length === 0 || !coversScope(proposal.data.kind)) return [];
  const { label, status } = proposal.data;
  if (label === null ? status !== "draft" : labelProblem(label) === null) return [];
  return [{ file: "proposal.md", line: 0, message: `Proposal ${cardName(p, "proposal", proposal.id)} needs a label of at most ${LABEL_LIMIT} characters for its Tasks` }];
}

/** The references of the `- \`<ref>\` — <where>` rows under a body section; other lines are prose. */
function bodyRows(body: string, heading: string): string[] {
  const refs: string[] = [];
  let inside = false;
  for (const line of body.split(/\r?\n/)) {
    const title = /^##\s+(.+?)\s*$/.exec(line)?.[1];
    if (title !== undefined) inside = title === heading;
    else if (inside) {
      const ref = /^- `([^`]+)`/.exec(line)?.[1];
      if (ref !== undefined) refs.push(ref);
    }
  }
  return refs;
}

/**
 * What covers a scope entry: the entry and every reference that contains it, lowercase. A Task or an Already present row
 * covers the entry by naming one of them. Empty when the reference does not resolve.
 */
function coverKeys(project: ProjectModel, ref: string): string[] {
  if (!resolves(project, ref)) return [];
  const req = parseRequirementRef(ref);
  if (isSpecsRef(ref)) return ref === "specs" ? ["specs"] : [ref, "specs"].map((key) => key.toLowerCase());
  if (req !== null) return [ref, ...(req.section === null ? [] : [`${REQUIREMENTS_PREFIX}${req.area}`])].map((key) => key.toLowerCase());
  const element = resolveRef(project.model, ref);
  // An Event sits in its Machine, and the Machine in its Feature: lineageRefs stops at the owner.
  const feature = element.kind === "event" && "feature" in element.owner ? [element.owner.feature] : [];
  return [...lineageRefs(project.model, element), ...feature].map((key) => key.toLowerCase());
}

/**
 * The rules of a Proposal's Tasks and of its `## Already present` rows, with the Proposal applied. Only an ordinary Proposal
 * not attached to a Drift holds Tasks, and each entry of its scope must be covered. A removed Model element is covered by
 * the removal Task that approval creates for it, so its removal entries need no Task here.
 */
function taskRules(p: Project, proposal: Proposal, project: ProjectModel, team?: ReadonlySet<string>): Diagnostic[] {
  if (proposal.data.kind === "handoff") return handoffRules(p, proposal, project, team);
  const out: Diagnostic[] = [];
  const at = (file: string, message: string) => {
    out.push({ file, line: 0, message });
  };
  const present = bodyRows(proposal.body, "Already present");
  for (const ref of present) if (!resolves(project, ref)) at("proposal.md", `"Already present" names ${ref}, which does not exist with the Proposal applied`);
  if (!holdsTasks(p, proposal)) {
    if (proposal.tasks.length > 0) at("proposal.md", noTasksReason(proposal));
    return out;
  }
  for (const task of proposal.tasks) {
    const file = `tasks/${task.name}`;
    for (const ref of task.refs) if (!resolves(project, ref)) at(file, `Task "${task.title}" names ${ref}, which does not exist with the Proposal applied`);
    const modelRefs = task.refs.filter((ref) => parseRequirementRef(ref) === null && !isSpecsRef(ref));
    if (task.technical && modelRefs.length > 0) at(file, `Technical Task "${task.title}" cannot reference the Model: ${modelRefs.join(", ")}`);
    if (!task.technical && modelRefs.length === 0) at(file, `Task "${task.title}" must reference a Model element, unless it is technical`);
  }
  for (const entry of proposalCoverage(p, proposal).scope)
    if (entry.coveredBy === "not covered") at("proposal.md", `${entry.ref} (${entry.reason}) is not covered by a Task or an Already present row`);
  return out;
}

/** The identities of the issues of the handoffs `proposal` requires, directly or through others: its issues may depend on them. Approved ones are the cards in `.trama/issues/`. */
function requiredIssueIds(p: Project, proposal: Proposal): Set<string> {
  const ids = new Set<string>();
  const seen = new Set<string>([proposal.id]);
  const queue = [...proposal.data.requires];
  for (let id = queue.pop(); id !== undefined; id = queue.pop()) {
    let required: Proposal;
    try {
      required = getProposal(p, id);
    } catch {
      continue;
    }
    if (seen.has(required.id)) continue;
    seen.add(required.id);
    queue.push(...required.data.requires);
    if (required.data.kind === "handoff") for (const issue of required.issues) ids.add(issue.id);
  }
  for (const card of listIssues(p)) if (seen.has(card.data.handoff)) ids.add(card.id);
  return ids;
}

/** The rules of a handoff with it applied (`rules#proposal/Draft`): what is wrong with its issues, and that it holds no Task file. */
function handoffRules(p: Project, proposal: Proposal, project: ProjectModel, team?: ReadonlySet<string>): Diagnostic[] {
  const out = handoffProblems({ issues: proposal.issues, resolves: (ref) => resolves(project, ref), required: requiredIssueIds(p, proposal), ...(team === undefined ? {} : { team }) });
  if (proposal.tasks.length > 0) out.push({ file: "proposal.md", line: 0, message: noTasksReason(proposal) });
  return out;
}

/** What covers each scope entry of a handoff: the identities of the issues that name it or an element that contains it, none when no issue does. Computed, never stored. */
export function handoffCoverage(p: Project, proposal: Proposal): { ref: string; reason: ScanScopeEntry["reason"]; coveredBy: string[] }[] {
  const after = buildProject(applied(p, proposal));
  return scanScope(buildProject(baseFiles(p, proposal)), after).map((entry) => {
    const keys = new Set(coverKeys(after, entry.ref));
    const coveredBy = proposal.issues.filter((issue) => issue.data.refs.some((ref) => resolves(after, ref) && keys.has(ref.toLowerCase()))).map((issue) => issue.id);
    return { ...entry, coveredBy };
  });
}

/**
 * Warnings that block neither validation nor hand-over, with the Proposal applied: fragments larger than 12 KB,
 * and the switch between fragment skills and index skills the Proposal would cause.
 */
export function proposalWarnings(p: Project, proposal: Proposal): Diagnostic[] {
  const after = applied(p, proposal);
  const warnings: Diagnostic[] = largeFragments(after).map((f) => ({ file: f.file, line: 0, message: largeFragmentMessage(f) }));
  const was = requirementSkillMode(buildProject(baseFiles(p, proposal)));
  const is = requirementSkillMode(buildProject(after));
  if (was.mode !== is.mode) {
    const how = is.mode === "index" ? "from one skill per fragment to one index skill per Area" : "from index skills back to one skill per fragment";
    warnings.push({ file: "requirements/", line: 0, message: `once applied, the Requirement skills switch ${how} (budget ${was.budget} → ${is.budget} of ${REQUIREMENT_SKILLS_BUDGET} characters)` });
  }
  // A handoff's warnings never refuse the hand-over: a scope entry no issue covers and an issue estimated over three days.
  if (proposal.data.kind === "handoff") {
    for (const entry of handoffCoverage(p, proposal)) if (entry.coveredBy.length === 0) warnings.push({ file: "proposal.md", line: 0, message: `Not covered: ${entry.ref}` });
    warnings.push(...handoffIssueWarnings(proposal.issues));
  }
  return warnings;
}

/** Warnings written apart from errors, after them; "" when there are none. */
export const warningsText = (warnings: Diagnostic[]) =>
  warnings.length === 0 ? "" : `\n\n${warnings.length} warning(s), which do not prevent validation or the hand-over:\n${warnings.map((d) => `- ${formatDiagnostic(d)}`).join("\n")}`;

/** What this Proposal itself changes, on top of the Proposals it requires. */
export function changes(p: Project, proposal: Proposal): FileChange[] {
  const before = baseFiles(p, proposal);
  const after = applied(p, proposal);
  const paths = [...new Set([...newFiles(proposal).keys(), ...proposal.data.delete])].sort();
  return paths.map((path) => diffFile(path, before.get(path), after.get(path)));
}

export type ApprovalBlockKind = "missing" | "draft" | "rejected" | "discarded" | "approved" | "waiting" | "stale" | "unregistered" | "invalid" | "unfixable" | "team" | "project";

export interface ApprovalBlock {
  kind: ApprovalBlockKind;
  /** One sentence naming the Proposal and why it cannot be approved now. */
  reason: string;
}

/** Why the Proposal `id` cannot be approved right now (so cannot be accepted through a Drift), or null when it can. */
export function approvalBlock(p: Project, id: string): ApprovalBlock | null {
  let proposal: Proposal;
  try {
    proposal = getProposal(p, id);
  } catch {
    return { kind: "missing", reason: `Proposal ${cardName(p, "proposal", id)} does not exist.` };
  }
  const name = `Proposal ${cardName(p, "proposal", proposal.id)}`;
  switch (proposal.data.status) {
    case "draft":
      return { kind: "draft", reason: `${name} is still being written.` };
    case "rejected":
      return { kind: "rejected", reason: `${name} was rejected.` };
    case "discarded":
      return { kind: "discarded", reason: `${name} was discarded.` };
    case "approved":
      return { kind: "approved", reason: `${name} is already approved.` };
    case "open":
      break;
  }
  const h = health(p, proposal);
  if (h.requires.length > 0) return { kind: "waiting", reason: `${name} requires other Proposals first: ${requiredReasons(h.requires, (id) => cardName(p, "proposal", id)).join("; ")}.` };
  if (h.stale.length > 0) return { kind: "stale", reason: `${name} is stale: the Model changed since it was written.` };
  if (h.unbased.length > 0) return { kind: "unregistered", reason: `${name} holds files it never registered.` };
  if (validateProposal(p, proposal).length > 0) return { kind: "invalid", reason: `${name} would leave the Model or its Requirements invalid.` };
  if (unfixableDrifts(p, proposal).length > 0) return { kind: "unfixable", reason: `${name} cannot fix the code of a Drift whose Model elements no longer exist.` };
  // A handoff is also blocked, for approving only, while Team is not available or no GitHub Project is linked.
  if (proposal.data.kind === "handoff") {
    const team = teamUnavailableReason(p);
    if (team !== null) return { kind: "team", reason: team };
    if (linkedGithubProject(p) === null) return { kind: "project", reason: LINK_PROJECT_FIRST };
  }
  return null;
}

/** What covers one scope entry: the identity of a Task of the Proposal, `already present`, `removal`, or `not covered`. */
export interface ScopeCoverage extends ScanScopeEntry {
  coveredBy: string;
}

/** A Model element the Proposal removes, with the reference its `Remove code of` Task points at (null when technical). */
export interface RemovalEntry {
  ref: string;
  reason: RemovedKind;
  coveredBy: string | null;
}

/** The removals and the scope of an ordinary Proposal, each scope entry with what covers it; computed, never stored. */
export function proposalCoverage(p: Project, proposal: Proposal): { removals: RemovalEntry[]; scope: ScopeCoverage[] } {
  const before = buildProject(baseFiles(p, proposal));
  const after = buildProject(applied(p, proposal));
  const removals = removedElements(before.model, after.model).map((e) => ({ ref: e.ref, reason: e.kind, coveredBy: e.container }));
  const present = bodyRows(proposal.body, "Already present").filter((ref) => resolves(after, ref)).map((ref) => ref.toLowerCase());
  const scope = scanScope(before, after).map((entry) => {
    const keys = new Set(coverKeys(after, entry.ref));
    const task = proposal.tasks.find((t) => t.refs.some((ref) => resolves(after, ref) && keys.has(ref.toLowerCase())));
    const coveredBy = task?.id ?? (present.some((key) => keys.has(key)) ? "already present" : entry.reason === "removed, its container" && parseRequirementRef(entry.ref) === null ? "removal" : "not covered");
    return { ...entry, coveredBy };
  });
  return { removals, scope };
}

/**
 * Copies the Proposal's files into a `.trama` folder. Does not change its status and does not regenerate skills.
 */
export function writeProposalFiles(p: Project, id: string, tramaDir: string): Proposal {
  const proposal = getProposal(p, id);
  for (const path of proposal.data.delete) rmSync(trackedLocation(tramaDir, path));
  for (const [path, content] of newFiles(proposal)) writeFileEnsuringDir(trackedLocation(tramaDir, path), content);
  return proposal;
}

/**
 * `skillsDirs` are the configured skills folders (besides the usual ones) where the generated `trama-req-*` skills are refreshed.
 * Approving a resolution resolves its still-open listed Drifts in the same step; `resolved` says what happened to each.
 */
export function approveProposal(p: Project, id: string, skillsDirs: string[] = []): Omit<Proposal, "issues"> & { resolved: DriftOutcome[]; issues: string[] } {
  const proposal = getProposal(p, id);
  requireStatus(p, proposal, "open", "approved");
  const h = health(p, proposal);
  if (h.requires.length > 0)
    throw new TramaError(`Proposal ${cardName(p, "proposal", proposal.id)} requires other Proposals first:\n${requiredReasons(h.requires, (id) => cardName(p, "proposal", id)).map((r) => `- ${r}`).join("\n")}`);
  if (h.stale.length > 0)
    throw new TramaError(`Proposal ${cardName(p, "proposal", proposal.id)} is stale: the Model changed since it touched ${h.stale.join(", ")}. Write a new Proposal.`);
  if (h.unbased.length > 0)
    throw new TramaError(`Proposal ${cardName(p, "proposal", proposal.id)} contains files it never registered: ${h.unbased.join(", ")}. Use "trama proposal edit" first.`);
  const errors = validateProposal(p, proposal);
  if (errors.length > 0)
    throw new TramaError(`Proposal ${cardName(p, "proposal", proposal.id)} would leave the Model invalid:\n${errors.map((d) => `- ${formatDiagnostic(d)}`).join("\n")}`);
  const unfixable = unfixableDrifts(p, proposal);
  if (unfixable.length > 0)
    throw new TramaError(`Proposal ${cardName(p, "proposal", proposal.id)} cannot be approved, nothing changed:\n${unfixable.map((r) => `- ${r}`).join("\n")}\nHave Resolve Drifts rewrite the resolution.`);
  // A handoff is approved only while Team is available and a GitHub Project is linked (`rules#proposal/Draft`).
  if (proposal.data.kind === "handoff") {
    requireTeam(p);
    if (linkedGithubProject(p) === null) throw new TramaError(`Proposal ${cardName(p, "proposal", proposal.id)} cannot be approved, nothing changed: ${LINK_PROJECT_FIRST}`);
  }

  // An ordinary Proposal not attached to a Drift brings its Tasks: planned, and refused, before any file changes. A handoff brings no Task: its issue cards are planned the same way.
  const bringsTasks = holdsTasks(p, proposal);
  const tasks = bringsTasks
    ? planApprovalTasks(p, proposal, removedElements(buildProject(baseFiles(p, proposal)).model, buildProject(applied(p, proposal)).model), createdNow())
    : [];
  const cards = proposal.data.kind === "handoff" ? planApprovalIssues(p, { id: proposal.id, label: proposal.data.label ?? "" }, proposal.issues) : [];
  const written = writeProposalFiles(p, id, p.dir);
  written.data.status = "approved";
  save(written);
  writeApprovalTasks(p, tasks);
  writeApprovalIssues(cards);
  const resolved = written.data.kind === "resolution" ? resolveListedDrifts(p, written) : [];
  syncRequirementSkills(p, skillsDirs);
  return { ...written, resolved, issues: cards.map((card) => card.id) };
}

/**
 * Rejects an open Proposal. The feedback is optional: with text it is appended under `## Feedback`; empty or blank adds nothing.
 * `reworkRequested` (Rework with feedback) writes `reworkRequested: true` in the same step; rejections through a Drift leave it off.
 */
export function rejectProposal(p: Project, id: string, feedback = "", options: { reworkRequested?: boolean } = {}): Proposal {
  const proposal = getProposal(p, id);
  requireStatus(p, proposal, "open", "rejected");
  proposal.data.status = "rejected";
  if (options.reworkRequested === true) proposal.data.reworkRequested = true;
  const text = feedback.trim();
  if (text) proposal.body = `${proposal.body.trimEnd()}\n\n## Feedback\n\n${text}\n`;
  save(proposal);
  removeBoundTo(p, proposal.id);
  pruneImages(p);
  return proposal;
}

/**
 * The agent hands a Draft over to the developer. Refused, leaving it a Draft, when the Model and Requirements
 * with it applied would have errors or when a file it holds was never registered. Being stale or requiring
 * Proposals that are not approved yet does not refuse it: writing cannot fix those; nor do the warnings, which are returned.
 * A successful hand-over consumes the design request the Proposal is bound to: `requestConsumed` is true when its file was deleted.
 * A successful hand-over clears `refining`, so the Draft reads as written again.
 * A setup Proposal handed over to an empty Model is approved at once, as the developer's approval would; when that refuses it,
 * it stays Open and `openReason` says why.
 */
export function submitProposal(
  p: Project,
  id: string,
  skillsDirs: string[] = [],
  options: { team?: TeamRoster } = {},
): Proposal & { requestConsumed: boolean; warnings: Diagnostic[]; approvedAtHandOver: boolean; openReason: string | null } {
  const proposal = getProposal(p, id);
  requireStatus(p, proposal, "draft", "handed over");
  const problems: string[] = [];
  const { unbased } = health(p, proposal);
  if (unbased.length > 0) problems.push(`it contains files it never registered: ${unbased.join(", ")}. Use "trama proposal edit" first`);
  problems.push(...driftListProblems(p, proposal));
  // The hand-over of a handoff needs Team and the members of the team, which the editor answers (`cli#team`): without them it is refused with the reason.
  const handoff = proposal.data.kind === "handoff";
  const unavailable = handoff ? teamUnavailableReason(p) : null;
  if (unavailable !== null) problems.push(unavailable);
  else if (handoff && options.team === undefined) problems.push("the members of the team were not read from the editor");
  else if (handoff && options.team !== undefined && "reason" in options.team) problems.push(options.team.reason);
  const roster = options.team !== undefined && "handles" in options.team ? options.team.handles : undefined;
  const errors = validateProposal(p, proposal, roster);
  if (errors.length > 0) problems.push(`${handoff ? "it has problems" : "it would leave the Model invalid"}:\n${errors.map((d) => `  - ${formatDiagnostic(d)}`).join("\n")}`);
  const warnings = proposalWarnings(p, proposal);
  if (problems.length > 0)
    throw new TramaError(`Proposal ${cardName(p, "proposal", proposal.id)} cannot be handed over yet:\n${problems.map((x) => `- ${x}`).join("\n")}${warningsText(warnings)}`);
  proposal.data.status = "open";
  proposal.data.refining = false;
  save(proposal);
  pruneImages(p);
  removeBoundTo(p, proposal.id, true);
  const requestConsumed = proposal.data.request !== null && consumeRequest(p, proposal.data.request);
  const handedOver = { ...proposal, requestConsumed, warnings, approvedAtHandOver: false, openReason: null };
  const model = buildProject(baseFiles(p, proposal)).model;
  if (proposal.data.kind !== "setup" || model.features.size > 0 || model.actors.size > 0) return handedOver;
  try {
    approveProposal(p, proposal.id, skillsDirs);
  } catch (err) {
    if (!(err instanceof TramaError)) throw err;
    return { ...handedOver, openReason: err.message };
  }
  return { ...getProposal(p, proposal.id), requestConsumed, warnings, approvedAtHandOver: true, openReason: null };
}

/**
 * `developer.CHANGE_ISSUE_FIELD`: records the Manager's value for the field `key` of the issue `issueId` of the open handoff `handoffId`, in `manager` of the issue's file and nowhere
 * else: the agent's value stays in its own field, a value equal to it removes the key (the undo), and the handoff stays Open, neither stale nor a Draft, its `base` untouched.
 * Refused, changing nothing, on a handoff that is not open (never on a Draft: an agent is writing it) and for a value the field does not accept (`fieldChange`).
 */
export function setIssueField(p: Project, handoffId: string, issueId: string, key: string, value: ManagerValue, rules: FieldRules): ProposalIssue {
  return withProposalLock(p, handoffId, () => {
    const proposal = getProposal(p, handoffId);
    const name = cardName(p, "proposal", proposal.id);
    requireHandoff(p, proposal);
    if (proposal.data.status === "draft") throw new TramaError(`Proposal ${name} is still being written: the agent has not handed it over, so the fields of its issues cannot be changed yet`);
    if (proposal.data.status !== "open") throw new TramaError(`Proposal ${name} is ${proposal.data.status}; only the issues of an open handoff can be changed`);
    const issue = proposal.issues.find((i) => i.id === issueId);
    if (issue === undefined) throw new TramaError(`Proposal ${name} has no issue ${issueId}`);
    const manager = fieldChange(issue.data, key, value, rules);
    const doc = readDocument(issue.path);
    if (Object.keys(manager).length === 0) delete doc.data["manager"];
    else doc.data["manager"] = manager;
    writeDocument(issue.path, doc.data, doc.body);
    return { ...issue, data: { ...issue.data, manager } };
  });
}

/** The developer gives up a Draft the agent never finished. Nothing is asked of the agent and nothing is appended. */
export function discardProposal(p: Project, id: string): Proposal {
  const proposal = getProposal(p, id);
  requireNotAttached(p, proposal.id);
  requireStatus(p, proposal, "draft", "discarded");
  return giveUp(p, proposal);
}

/**
 * Gives up the Proposal attached to a Drift that the developer closes from the panel: a Draft or a handed-over one, with no feedback.
 * A Proposal already decided is left as it is.
 */
export function discardAttachedProposal(p: Project, id: string): Proposal {
  const proposal = getProposal(p, id);
  if (proposal.data.status !== "draft" && proposal.data.status !== "open") return proposal;
  return giveUp(p, proposal);
}

function giveUp(p: Project, proposal: Proposal): Proposal {
  proposal.data.status = "discarded";
  save(proposal);
  removeBoundTo(p, proposal.id);
  pruneImages(p);
  return proposal;
}

/** The resolution being written or open (other than `exceptId`) that lists Drift `driftId`, or null. A Drift sits in one such resolution at a time. */
export function resolutionHolding(p: Project, driftId: string, exceptId?: string): Proposal | null {
  return listProposals(p).find((r) => r.id !== exceptId && r.data.kind === "resolution" && (r.data.status === "draft" || r.data.status === "open") && r.data.drifts.some((d) => d.drift === driftId)) ?? null;
}

/** What is wrong with the Drift list of a resolution: empty, a Drift no longer open, or one also in another resolution being written or open. Empty for any other Proposal. */
export function driftListProblems(p: Project, proposal: Proposal): string[] {
  if (proposal.data.kind !== "resolution") return [];
  if (proposal.data.drifts.length === 0) return ["its Drift list is empty: list at least one Drift with \"drifts\" in \"trama proposal edit\""];
  const drifts = new Map(listDrifts(p).map((d) => [d.id, d]));
  const after = buildProject(applied(p, proposal));
  const problems: string[] = [];
  for (const { drift: id } of proposal.data.drifts) {
    const name = cardName(p, "drift", id);
    const drift = drifts.get(id);
    if (drift?.data.status !== "open") problems.push(`Drift ${name} is no longer open`);
    else if (proposal.data.drifts.find((d) => d.drift === id)?.decision === "fix-code") {
      const refusal = fixCodeRefusal(p, drift, after);
      if (refusal) problems.push(refusal);
    }
    const other = resolutionHolding(p, id, proposal.id);
    if (other) problems.push(`Drift ${name} is also in resolution ${cardName(p, "proposal", other.id)}, which is still to be decided`);
  }
  return problems;
}

/** Why a resolution cannot be approved: a listed, still-open Drift is to be fixed in code but none of its Model elements is left once the resolution's files are applied. Empty for any other Proposal. */
export function unfixableDrifts(p: Project, proposal: Proposal): string[] {
  if (proposal.data.kind !== "resolution") return [];
  const open = new Map(listDrifts(p).filter((d) => d.data.status === "open").map((d) => [d.id, d]));
  const after = buildProject(applied(p, proposal));
  return proposal.data.drifts.flatMap(({ drift, decision }) => {
    const d = open.get(drift);
    return (decision === "fix-code" && d && fixCodeRefusal(p, d, after)) || [];
  });
}
