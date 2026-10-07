import { existsSync, readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { type AgentOrigin, type Announcement, bindDraft, markActivity, markDraftActivity, removeBoundTo } from "./announcements";
import { consumeRequest, requestExists } from "./design-requests";
import { diffFile, type FileChange } from "./diff";
import { TramaError } from "./errors";
import { formatDiagnostic } from "./model";
import { buildProject, largeFragmentMessage, largeFragments, REQUIREMENT_SKILLS_BUDGET } from "./requirements";
import { requirementSkillMode, syncRequirementSkills } from "./requirement-skills";
import { canonicalCardId, createdField, enumField, type Raw, stringList, stringMap, textOrNull } from "./schema";
import {
  compareByCreation,
  createdNow,
  findCard,
  listCards,
  newCardId,
  type Project,
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
import { cardName, identityOfShortNumber } from "./short-numbers";
import { SCAN_REASONS, scanScope, type ScanScopeEntry } from "./scan-scope";

/**
 * `draft`: the agent is still writing it; only the agent hands it over and only the developer can discard it.
 * `open`: handed over, waiting for the developer. A file without a status is `open`.
 */
export type ProposalStatus = "draft" | "open" | "approved" | "rejected" | "discarded";

/** `import`: written by the trama-import skill to describe existing code; approving it starts no Scan. */
export type ProposalKind = "change" | "import";

interface ProposalData {
  status: ProposalStatus;
  kind: ProposalKind;
  /** IDs of Proposals that must be approved before this one; it is written and validated on top of them. */
  requires: string[];
  /** Tracked path -> sha256 of the file, or "new", when the Proposal first touched it (on top of `requires`). */
  base: Record<string, string>;
  delete: string[];
  /** The written design request the Proposal was born from; kept after the request is consumed. */
  request: string | null;
  /** When the Proposal was created, UTC ISO 8601. Absent on numbered Proposals written before the field existed. */
  created: string | null;
  /** What a targeted scan compares, written once when an ordinary Proposal is approved. */
  scanScope: ScanScopeEntry[] | null;
}

export interface Proposal {
  id: string;
  name: string;
  dir: string;
  data: ProposalData;
  body: string;
  title: string;
}

const proposalsDir = (p: Project) => join(p.dir, "proposals");

const STATUSES: readonly ProposalStatus[] = ["draft", "open", "approved", "rejected", "discarded"];
const KINDS: readonly ProposalKind[] = ["change", "import"];

function parseData(raw: Raw, where: string): ProposalData {
  const data: ProposalData = {
    status: enumField(raw, "status", STATUSES, "open", where),
    kind: enumField(raw, "kind", KINDS, "change", where),
    requires: stringList(raw, "requires", where),
    base: stringMap(raw, "base", where),
    delete: stringList(raw, "delete", where),
    request: textOrNull(raw, "request", where),
    created: createdField(raw, where),
    scanScope: scanScopeField(raw, where),
  };
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

function scanScopeField(raw: Raw, where: string): ScanScopeEntry[] | null {
  const v = raw["scanScope"];
  if (v === undefined || v === null) return null;
  if (!Array.isArray(v) || v.some((e) => typeof e?.ref !== "string" || !SCAN_REASONS.includes(e.reason)))
    throw new TramaError(`${where}: "scanScope" must be a list of { ref, reason } with reason one of ${SCAN_REASONS.join(", ")}`);
  return v.map((e) => ({ ref: e.ref, reason: e.reason }));
}

function load(p: Project, entry: { id: string; name: string }): Proposal {
  const dir = join(proposalsDir(p), entry.name);
  const file = join(dir, "proposal.md");
  const doc = readDocument(file);
  const title = /^#\s+(.+)$/m.exec(doc.body)?.[1]?.trim() ?? entry.name;
  return { id: entry.id, name: entry.name, dir, body: doc.body, title, data: parseData(doc.data, file) };
}

/** Writes `proposal.md` from the Proposal's data, leaving defaults out of the file. */
export function save(proposal: Proposal) {
  const { kind, requires, request, created, scanScope, ...rest } = proposal.data;
  // Defaults stay out of the file, so Proposals without dependencies look as they always did.
  // Numbered Proposals have no `created`; writing it would pretend they remember an instant they do not.
  const data = {
    status: rest.status,
    ...(kind === "change" ? {} : { kind }),
    ...(requires.length === 0 ? {} : { requires }),
    base: rest.base,
    delete: rest.delete,
    ...(request === null ? {} : { request }),
    ...(created === null ? {} : { created }),
    ...(scanScope === null ? {} : { scanScope }),
  };
  writeDocument(join(proposal.dir, "proposal.md"), data, proposal.body);
}

export function listProposals(p: Project): Proposal[] {
  return listCards(proposalsDir(p), "folder")
    .map((e) => load(p, e))
    .sort((a, b) => compareByCreation({ id: a.id, created: a.data.created }, { id: b.id, created: b.data.created }));
}

/**
 * When the agent last created, changed or deleted a file inside a Draft bound to one of `announcements`, in epoch
 * milliseconds; 0 when there is none. Read from the Draft files' times: synchronizing an announcement's title is not
 * activity, and a deletion shows as the change of the folder that held the file.
 */
export function boundDraftsChangedAt(p: Project, announcements: readonly Announcement[]): number {
  const bound = new Set(announcements.map((a) => a.proposal));
  let latest = 0;
  for (const entry of listCards(proposalsDir(p), "folder")) {
    if (!bound.has(entry.id)) continue;
    const dir = join(proposalsDir(p), entry.name);
    for (const rel of ["", ...readdirSync(dir, { recursive: true, encoding: "utf8" })]) {
      try {
        latest = Math.max(latest, statSync(join(dir, rel)).mtimeMs);
      } catch {
        // Deleted between listing and reading: its folder's time already counts.
      }
    }
  }
  return latest;
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
  options: { requires?: string[]; kind?: ProposalKind; announcement?: string; origin?: AgentOrigin; request?: string } = {},
): Proposal {
  const requires = (options.requires ?? []).map((r) => {
    const required = getProposal(p, r);
    if (required.data.status === "rejected" || required.data.status === "discarded")
      throw new TramaError(`Proposal ${cardName(p, "proposal", required.id)} was ${required.data.status}; a new Proposal cannot require it`);
    return required.id;
  });
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
      requires: [...new Set(requires)],
      base: {},
      delete: [],
      // A request that does not exist binds nothing; the Proposal is created all the same.
      request: options.request !== undefined && requestExists(p, options.request) ? options.request : null,
      created: createdNow(),
      scanScope: null,
    },
    body: `# ${title}\n\n${body.trim()}\n`.replace(/\n\n\n$/, "\n"),
  };
  save(proposal);
  bindDraft(p, proposal, options.announcement, options.origin);
  return proposal;
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
 * A tracked path: `checkout/order.md` for the Model, `requirements/ui/area.md` or `requirements/ui/<fragment>.md` for
 * Requirements. `areaFolders` is false for paths a Proposal already recorded: those written before Areas became
 * folders (`requirements/ui.md`) stay readable as history; only a new registration must use the folder layout.
 */
function normalizeModelPath(path: string, areaFolders = true): string {
  const clean = path.replace(/\\/g, "/").replace(/^\.\//, "").replace(/^\.trama\/model\//, "").replace(/^\.trama\/requirements\//, REQUIREMENTS_PREFIX);
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

/** Refuses unless the Proposal is in `status`; a Draft gets its own message, because the developer meets it as "not ready yet". */
function requireStatus(p: Project, proposal: Proposal, status: "draft" | "open", action: string) {
  if (proposal.data.status === status) return;
  const name = cardName(p, "proposal", proposal.id);
  if (proposal.data.status === "draft")
    throw new TramaError(`Proposal ${name} is still being written: the agent has not handed it over, so it cannot be ${action} yet`);
  throw new TramaError(`Proposal ${name} is ${proposal.data.status}; only ${status === "draft" ? "a Draft" : "open Proposals"} can be ${action}`);
}

function requireEditable(p: Project, proposal: Proposal) {
  if (proposal.data.status !== "draft" && proposal.data.status !== "open")
    throw new TramaError(`Proposal ${cardName(p, "proposal", proposal.id)} is ${proposal.data.status}; only drafts and open Proposals can be edited`);
}

/** An edit takes a handed-over Proposal back from the developer: it is a Draft until the next submit. */
function touch(proposal: Proposal) {
  if (proposal.data.status === "open") proposal.data.status = "draft";
}

/**
 * Makes `modelPath` editable inside the Proposal and returns the file to edit.
 * Calling it again for the same file keeps what was recorded for it, but still returns an open Proposal to Draft.
 * A file already in the Proposal but never registered gets its starting version recorded, its content untouched.
 */
export function editInProposal(p: Project, id: string, modelPath: string): string {
  const proposal = getProposal(p, id);
  requireEditable(p, proposal);
  const rel = normalizeModelPath(modelPath);
  const target = trackedLocation(proposal.dir, rel);
  if (proposal.data.delete.includes(rel)) throw new TramaError(`${rel} is marked for deletion in Proposal ${cardName(p, "proposal", proposal.id)}`);
  touch(proposal);
  markDraftActivity(p, proposal.id);
  const exists = existsSync(target);
  if (!exists || proposal.data.base[rel] === undefined) {
    const content = baseFiles(p, proposal).get(rel);
    proposal.data.base[rel] ??= content !== undefined ? sha256(content) : "new";
    if (!exists) writeFileEnsuringDir(target, content ?? "");
  }
  save(proposal);
  return target;
}

export function deleteInProposal(p: Project, id: string, modelPath: string) {
  const proposal = getProposal(p, id);
  requireEditable(p, proposal);
  const rel = normalizeModelPath(modelPath);
  const content = baseFiles(p, proposal).get(rel);
  if (content === undefined) throw new TramaError(`${rel} does not exist in the Model or its Requirements`);
  if (existsSync(trackedLocation(proposal.dir, rel)))
    throw new TramaError(`${rel} is already edited in Proposal ${cardName(p, "proposal", proposal.id)}; remove that copy first`);
  touch(proposal);
  markDraftActivity(p, proposal.id);
  proposal.data.base[rel] ??= sha256(content);
  if (!proposal.data.delete.includes(rel)) proposal.data.delete.push(rel);
  save(proposal);
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

export function health(p: Project, proposal: Proposal): ProposalHealth {
  const base = baseFiles(p, proposal);
  const touched = new Set([...newFiles(proposal).keys(), ...proposal.data.delete]);
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

/** Validation of the Model and its Requirements with the Proposal applied: a Requirement left pointing at a removed State is an error. */
export function validateProposal(p: Project, proposal: Proposal): Diagnostic[] {
  return buildProject(applied(p, proposal)).diagnostics;
}

/**
 * Warnings that block neither validation nor hand-over, with the Proposal applied: fragments larger than 12 KB,
 * and the switch between fragment skills and index skills the Proposal would cause.
 */
export function proposalWarnings(p: Project, proposal: Proposal): Diagnostic[] {
  const after = applied(p, proposal);
  const warnings: Diagnostic[] = largeFragments(after).map((f) => ({ file: f.file, line: 0, message: largeFragmentMessage(f) }));
  const was = requirementSkillMode(buildProject(baseFiles(p, proposal)).areas);
  const is = requirementSkillMode(buildProject(after).areas);
  if (was.mode !== is.mode) {
    const how = is.mode === "index" ? "from one skill per fragment to one index skill per Area" : "from index skills back to one skill per fragment";
    warnings.push({ file: "requirements/", line: 0, message: `once applied, the Requirement skills switch ${how} (budget ${was.budget} → ${is.budget} of ${REQUIREMENT_SKILLS_BUDGET} characters)` });
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

export type ApprovalBlockKind = "missing" | "draft" | "rejected" | "discarded" | "approved" | "waiting" | "stale" | "unregistered" | "invalid";

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
  if (h.requires.length > 0) return { kind: "waiting", reason: `${name} waits for other Proposals: ${h.requires.map((r) => cardName(p, "proposal", r.id)).join(", ")}.` };
  if (h.stale.length > 0) return { kind: "stale", reason: `${name} is stale: the Model changed since it was written.` };
  if (h.unbased.length > 0) return { kind: "unregistered", reason: `${name} holds files it never registered.` };
  if (validateProposal(p, proposal).length > 0) return { kind: "invalid", reason: `${name} would leave the Model or its Requirements invalid.` };
  return null;
}

/**
 * Copies the Proposal's files into a `.trama` folder. An ordinary Proposal also gets its scan scope, computed
 * against the open folder before anything is copied, written into its own copy in that folder.
 * Does not change its status and does not regenerate skills.
 */
export function writeProposalFiles(p: Project, id: string, tramaDir: string): Proposal {
  const proposal = getProposal(p, id);
  if (proposal.data.kind === "change") proposal.data.scanScope = scanScope(buildProject(readTrackedFiles(p)), buildProject(applied(p, proposal)));
  for (const path of proposal.data.delete) rmSync(trackedLocation(tramaDir, path));
  for (const [path, content] of newFiles(proposal)) writeFileEnsuringDir(trackedLocation(tramaDir, path), content);
  if (proposal.data.scanScope !== null) save({ ...proposal, dir: join(tramaDir, "proposals", proposal.name) });
  return proposal;
}

/** `skillsDirs` are the configured skills folders (besides the usual ones) where the generated `trama-req-*` skills are refreshed. */
export function approveProposal(p: Project, id: string, skillsDirs: string[] = []): Proposal {
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

  const written = writeProposalFiles(p, id, p.dir);
  written.data.status = "approved";
  save(written);
  syncRequirementSkills(p, skillsDirs);
  return written;
}

/** Rejects an open Proposal. The feedback is optional: with text it is appended under `## Feedback`; empty or blank adds nothing. */
export function rejectProposal(p: Project, id: string, feedback = ""): Proposal {
  const proposal = getProposal(p, id);
  requireStatus(p, proposal, "open", "rejected");
  proposal.data.status = "rejected";
  const text = feedback.trim();
  if (text) proposal.body = `${proposal.body.trimEnd()}\n\n## Feedback\n\n${text}\n`;
  save(proposal);
  return proposal;
}

/**
 * The agent hands a Draft over to the developer. Refused, leaving it a Draft, when the Model and Requirements
 * with it applied would have errors or when a file it holds was never registered. Being stale or requiring
 * Proposals that are not approved yet does not refuse it: writing cannot fix those; nor do the warnings, which are returned.
 * A successful hand-over consumes the design request the Proposal is bound to: `requestConsumed` is true when its file was deleted.
 */
export function submitProposal(p: Project, id: string): Proposal & { requestConsumed: boolean; warnings: Diagnostic[] } {
  const proposal = getProposal(p, id);
  requireStatus(p, proposal, "draft", "handed over");
  const problems: string[] = [];
  const { unbased } = health(p, proposal);
  if (unbased.length > 0) problems.push(`it contains files it never registered: ${unbased.join(", ")}. Use "trama proposal edit" first`);
  const errors = validateProposal(p, proposal);
  if (errors.length > 0) problems.push(`it would leave the Model invalid:\n${errors.map((d) => `  - ${formatDiagnostic(d)}`).join("\n")}`);
  const warnings = proposalWarnings(p, proposal);
  if (problems.length > 0)
    throw new TramaError(`Proposal ${cardName(p, "proposal", proposal.id)} cannot be handed over yet:\n${problems.map((x) => `- ${x}`).join("\n")}${warningsText(warnings)}`);
  proposal.data.status = "open";
  save(proposal);
  removeBoundTo(p, proposal.id);
  markActivity(p);
  const requestConsumed = proposal.data.request !== null && consumeRequest(p, proposal.data.request);
  return { ...proposal, requestConsumed, warnings };
}

/** The developer gives up a Draft the agent never finished. Nothing is asked of the agent and nothing is appended. */
export function discardProposal(p: Project, id: string): Proposal {
  const proposal = getProposal(p, id);
  requireStatus(p, proposal, "draft", "discarded");
  proposal.data.status = "discarded";
  save(proposal);
  removeBoundTo(p, proposal.id);
  return proposal;
}
