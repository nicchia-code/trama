import { referencesFingerprint } from "./describe";
import { TramaError, UsageError } from "./errors";
import { getProposal, listProposals } from "./proposals";
import { parseQuestionRequest, type Question, type QuestionAnswer } from "./questions";
import type { PreparedAnswer } from "./resolution";
import { loadProject, type ProjectModel } from "./requirements";
import { cardName } from "./short-numbers";
import type { Project } from "./store";
import { checkAttachment, type Drift, driftOptions, getDrift, preparedSectionText, saveDrift, withPreparedSection } from "./work";

/*
 * The prepared question of an open Drift: the question Resolve Drifts would ask the developer about it, with a decision
 * for each option, kept in the `## Prepared question` section of the Drift's file. It records the fingerprint of the text
 * the briefing of a comparison gives for the Drift's references, so a change of the Model or Requirements makes it stale.
 */

/** What an option of the prepared question does when the developer picks it: fix the code with that fix option (from 1), adopt the attached Proposal, or close the Drift without changes. */
export type PreparedDecision = { decision: "fix-code"; option: number } | { decision: "proposal" } | { decision: "dismissed" };

export interface PreparedQuestion {
  question: Question;
  /** One decision for each option of `question`, in the same order. */
  decisions: PreparedDecision[];
  /** SHA-256 of the briefing text of the Drift's references when the question was prepared. */
  fingerprint: string;
  /** When it was prepared, UTC ISO 8601. */
  prepared: string;
}

/** The prepared question in a Drift's file: it holds (`valid`), it is `stale` for the reason given, or its section does not read. */
export type PreparedStatus =
  | { state: "valid"; value: PreparedQuestion }
  | { state: "stale"; value: PreparedQuestion; reason: string }
  | { state: "unreadable" };

/** `{ valid }` for a prepared question that reads, null for none or an unreadable one: what `list`, `show`, the Snapshot and `--json` carry. */
export function preparedFlag(status: PreparedStatus | null): { valid: boolean } | null {
  return status === null || status.state === "unreadable" ? null : { valid: status.state === "valid" };
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** The text a status line shows: `valid`, `stale: <reason>` or `unreadable`. */
export function preparedStatusText(status: PreparedStatus): string {
  return status.state === "stale" ? `stale: ${status.reason}` : status.state;
}

/** A decision as written in a file or given in an input, or null when its shape is wrong. Only the keys of the decision are allowed. */
function readDecision(v: unknown): PreparedDecision | null {
  if (!isObject(v)) return null;
  const keys = Object.keys(v);
  if (v["decision"] === "fix-code")
    return keys.length === 2 && Number.isInteger(v["option"]) && (v["option"] as number) >= 1 ? { decision: "fix-code", option: v["option"] as number } : null;
  if ((v["decision"] === "proposal" || v["decision"] === "dismissed") && keys.length === 1) return { decision: v["decision"] };
  return null;
}

/** The question and decisions of a section, or null when they do not read: one question of the round format, with the Drift's identity as `id`, `multi: false`, and a decision for each option. */
function readQuestion(drift: Drift, question: unknown, decisions: unknown): { question: Question; decisions: PreparedDecision[] } | null {
  try {
    const parsed = parseQuestionRequest({ questions: [question] }).questions[0] as Question;
    if (parsed.id !== drift.id || parsed.multi) return null;
    if (!Array.isArray(decisions) || decisions.length !== parsed.options.length) return null;
    const read = decisions.map(readDecision);
    return read.every((d) => d !== null) ? { question: parsed, decisions: read as PreparedDecision[] } : null;
  } catch {
    return null;
  }
}

/** The prepared question in the Drift's file: null without the section, `unreadable` when the section does not read. */
export function readPrepared(drift: Drift): PreparedQuestion | "unreadable" | null {
  const text = preparedSectionText(drift);
  if (text === null) return null;
  const json = /```json\n([\s\S]*?)\n```/.exec(text)?.[1];
  if (json === undefined) return "unreadable";
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return "unreadable";
  }
  if (!isObject(data) || typeof data["fingerprint"] !== "string" || data["fingerprint"] === "" || typeof data["prepared"] !== "string" || Number.isNaN(Date.parse(data["prepared"]))) return "unreadable";
  const read = readQuestion(drift, data["question"], data["decisions"]);
  return read === null ? "unreadable" : { ...read, fingerprint: data["fingerprint"], prepared: data["prepared"] };
}

/** Why a prepared question no longer holds, or null when it does. The code of the project plays no part, and nothing is deleted. */
function stalenessOf(p: Project, drift: Drift, value: PreparedQuestion, project: ProjectModel): string | null {
  if (drift.data.status !== "open") return "the Drift is resolved";
  if (referencesFingerprint(project, drift.data.refs) !== value.fingerprint) return "Model or Requirements changed";
  const options = driftOptions(drift).length;
  if (value.decisions.some((d) => d.decision === "fix-code" && d.option > options)) return "a fix option no longer exists";
  if (value.decisions.some((d) => d.decision === "proposal")) {
    const attached = drift.data.proposal === null ? null : getProposalOrNull(p, drift.data.proposal);
    if (attached === null || (attached.data.status !== "draft" && attached.data.status !== "open")) return "the attached Proposal is no longer in writing or open";
  }
  return null;
}

const getProposalOrNull = (p: Project, id: string) => {
  try {
    return getProposal(p, id);
  } catch {
    return null;
  }
};

/** The prepared question of a Drift and whether it holds; null when the Drift has none. An unreadable section is not an error. */
export function preparedStatus(p: Project, drift: Drift, project: ProjectModel = loadProject(p)): PreparedStatus | null {
  const read = readPrepared(drift);
  if (read === null) return null;
  if (read === "unreadable") return { state: "unreadable" };
  const reason = stalenessOf(p, drift, read, project);
  return reason === null ? { state: "valid", value: read } : { state: "stale", value: read, reason };
}

/** The open Drifts among `drifts` that have no valid prepared question and are in no resolution being written or open. */
export function unpreparedDrifts(p: Project, drifts: Drift[]): Drift[] {
  const project = loadProject(p);
  const held = new Set(listProposals(p).filter((r) => r.data.kind === "resolution" && (r.data.status === "draft" || r.data.status === "open")).flatMap((r) => r.data.drifts.map((d) => d.drift)));
  return drifts.filter((d) => d.data.status === "open" && !held.has(d.id) && preparedStatus(p, d, project)?.state !== "valid");
}

/** What `drift edit` takes as `prepared`: the question and a decision for each option. */
export interface PreparedInput {
  question: unknown;
  decisions: unknown;
}

/** A refusal that names the field of the input it is about. */
const refuse = (field: string, message: string) => new UsageError(`${field}: ${message}`);

/** The question of an input, parsed by the rules of `trama question new` with its errors renamed to the field. */
function checkQuestion(drift: Drift, question: unknown): Question {
  let parsed: Question;
  try {
    parsed = parseQuestionRequest({ questions: [question] }).questions[0] as Question;
  } catch (error) {
    if (error instanceof UsageError) throw refuse("prepared.question", error.message.replace(/^questions\[0\]\.?/, "").replace(/^request\.questions/, "questions"));
    throw error;
  }
  if (parsed.id !== drift.id) throw refuse("prepared.question.id", `must be the Drift's permanent identity ${drift.id}`);
  if (parsed.multi) throw refuse("prepared.question.multi", "must be false");
  return parsed;
}

/**
 * The decisions of an input, checked against the question and the Drift: one for each option, the `fix-code` ones naming
 * each fix option once, and with fix options exactly one `proposal` or `dismissed` more; without fix options both, once.
 */
function checkDecisions(drift: Drift, question: Question, decisions: unknown, hasProposal: boolean): PreparedDecision[] {
  if (!Array.isArray(decisions)) throw refuse("prepared.decisions", "must be a list with a decision for each option");
  if (decisions.length !== question.options.length) throw refuse("prepared.decisions", `needs one decision for each of the ${question.options.length} options, found ${decisions.length}`);
  const read = decisions.map((d, i) => {
    const decision = readDecision(d);
    if (decision === null) throw refuse(`prepared.decisions[${i}]`, 'must be {"decision":"fix-code","option":<number from 1>}, {"decision":"proposal"} or {"decision":"dismissed"}');
    return decision;
  });
  const fixOptions = driftOptions(drift).length;
  const fixed = read.flatMap((d) => (d.decision === "fix-code" ? [d.option] : []));
  const missing = Array.from({ length: fixOptions }, (_, i) => i + 1).filter((n) => !fixed.includes(n));
  const unknown = fixed.find((n) => n > fixOptions);
  if (unknown !== undefined) throw refuse("prepared.decisions", `fix option ${unknown} does not exist: the Drift has ${fixOptions}`);
  if (new Set(fixed).size !== fixed.length) throw refuse("prepared.decisions", "a fix option is named more than once");
  if (missing.length > 0) throw refuse("prepared.decisions", `every fix option needs a decision: missing ${missing.join(", ")}`);
  const proposals = read.filter((d) => d.decision === "proposal").length;
  const dismissals = read.filter((d) => d.decision === "dismissed").length;
  if (fixOptions === 0 ? proposals !== 1 || dismissals !== 1 : proposals + dismissals !== 1)
    throw refuse("prepared.decisions", fixOptions === 0 ? 'a Drift without fix options needs exactly one "proposal" and one "dismissed"' : 'besides the fix options, exactly one "proposal" or "dismissed" is needed');
  if (proposals > 0 && !hasProposal) throw refuse("prepared.decisions", 'a "proposal" decision needs an attached Proposal: attach one with "proposal"');
  return read;
}

/**
 * `trama drift edit`: attaches a Proposal to an open Drift that has none and/or prepares its question. Everything is checked
 * before anything is written; a refusal is a usage error naming the field and changes nothing. Returns the Drift as written.
 */
export function editDrift(p: Project, id: string, input: { prepared?: PreparedInput; proposal?: string }): Drift {
  if (input.prepared === undefined && input.proposal === undefined) throw new UsageError("Give at least one of `prepared` and `proposal`");
  const drift = getDrift(p, id, true);
  if (drift.data.status !== "open") throw new UsageError(`Drift ${cardName(p, "drift", drift.id)} is already resolved: only an open Drift can be edited`);
  let attached = drift.data.proposal;
  if (input.proposal !== undefined) {
    try {
      attached = checkAttachment(p, drift, input.proposal).id;
    } catch (error) {
      if (error instanceof TramaError) throw refuse("proposal", error.message);
      throw error;
    }
  }
  let body: string | null = null;
  if (input.prepared !== undefined) {
    const question = checkQuestion(drift, input.prepared.question);
    const decisions = checkDecisions(drift, question, input.prepared.decisions, attached !== null);
    const value: PreparedQuestion = { question, decisions, fingerprint: referencesFingerprint(loadProject(p), drift.data.refs), prepared: new Date().toISOString() };
    body = withPreparedSection(drift, JSON.stringify(value, null, 2));
  }
  drift.data.proposal = attached;
  if (body !== null) drift.body = body;
  saveDrift(drift);
  return drift;
}

/** What the answer to a prepared question leads to: a resolution Trama writes itself, the Drift's resolution agent, or nothing. */
export type PreparedOutcome = { kind: "write"; answer: PreparedAnswer } | { kind: "agent"; answer: { selected: string[]; text?: string } } | { kind: "none" };

/**
 * Reads the answer to the prepared question of a Drift. A Fix option (its free text is the note) becomes `fix-code`; the
 * option that closes the Drift or adopts its Proposal, with no free text, becomes `dismissed` or `proposal`. Free text with
 * one of those two options, or an answer that picks no option of the question, needs the agent. A skip leads to nothing.
 */
export function preparedOutcome(value: PreparedQuestion, answer: QuestionAnswer | undefined): PreparedOutcome {
  if (answer === undefined || answer.status !== "answered") return { kind: "none" };
  const text = answer.text?.trim() ?? "";
  const forAgent: PreparedOutcome = { kind: "agent", answer: { selected: answer.selected, ...(text === "" ? {} : { text: answer.text }) } };
  const index = answer.selected.length === 1 ? value.question.options.findIndex((o) => o.label === answer.selected[0]) : -1;
  const decision = index < 0 ? undefined : value.decisions[index];
  if (decision === undefined) return forAgent;
  if (decision.decision === "fix-code") return { kind: "write", answer: { decision: "fix-code", option: decision.option, ...(text === "" ? {} : { note: text }) } };
  return text === "" ? { kind: "write", answer: { decision: decision.decision } } : forAgent;
}
