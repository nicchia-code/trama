import { referencesFingerprint } from "./describe";
import { TramaError, UsageError } from "./errors";
import { getProposal, listProposals } from "./proposals";
import { parseQuestionRequest, type Question, type QuestionAnswer } from "./questions";
import type { PreparedAnswer } from "./resolution";
import { loadProject, type ProjectModel } from "./requirements";
import { cardName } from "./short-numbers";
import type { Project } from "./store";
import { checkAttachment, checkDifferenceAttachment, type Difference, type Drift, differenceOf, driftOptions, getDrift, hasDifferences, indexDrifts, listDrifts, openDifferences, preparedSectionText, saveDrift, withPreparedSection } from "./work";

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

/** The question and decisions of a section, or null when they do not read: one question of the round format, with `id` (the Drift's identity, or the `drift` of the difference) as its `id`, `multi: false`, and a decision for each option. */
function readQuestion(id: string, question: unknown, decisions: unknown): { question: Question; decisions: PreparedDecision[] } | null {
  try {
    const parsed = parseQuestionRequest({ questions: [question] }).questions[0] as Question;
    if (parsed.id !== id || parsed.multi) return null;
    if (!Array.isArray(decisions) || decisions.length !== parsed.options.length) return null;
    const read = decisions.map(readDecision);
    return read.every((d) => d !== null) ? { question: parsed, decisions: read as PreparedDecision[] } : null;
  } catch {
    return null;
  }
}

/** The prepared question in the Drift's file: null without the section, `unreadable` when the section does not read. */
export function readPrepared(drift: Drift): PreparedQuestion | "unreadable" | null {
  // A unified Drift with differences has a round (`readPreparedRound`), not one question.
  if (hasDifferences(drift)) return null;
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
  const read = readQuestion(drift.id, data["question"], data["decisions"]);
  return read === null ? "unreadable" : { ...read, fingerprint: data["fingerprint"], prepared: data["prepared"] };
}

/** One question of the prepared round of a unified Drift with differences: the difference it is about, and the question as read, or `unreadable` when only that entry does not read. */
export interface RoundEntry {
  difference: string;
  value: PreparedQuestion | "unreadable";
}

/**
 * The prepared round in the file of a unified Drift with differences (`## Prepared question`: one `json` object `{ questions, prepared }`),
 * in the order of the file: null without the section or for a Drift without differences, `unreadable` when the section does not read, and
 * otherwise one entry per question, an entry that does not read being `unreadable` on its own. A difference decided later keeps its entry.
 */
export function readPreparedRound(drift: Drift): RoundEntry[] | "unreadable" | null {
  if (!hasDifferences(drift)) return null;
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
  if (!isObject(data) || !Array.isArray(data["questions"]) || typeof data["prepared"] !== "string" || Number.isNaN(Date.parse(data["prepared"]))) return "unreadable";
  const prepared = data["prepared"];
  return data["questions"].flatMap((entry): RoundEntry[] => {
    if (!isObject(entry) || typeof entry["difference"] !== "string") return [];
    const difference = entry["difference"];
    if (typeof entry["fingerprint"] !== "string" || entry["fingerprint"] === "") return [{ difference, value: "unreadable" }];
    const read = readQuestion(difference, entry["question"], entry["decisions"]);
    return [{ difference, value: read === null ? "unreadable" : { ...read, fingerprint: entry["fingerprint"], prepared } }];
  });
}

/** What a prepared question is checked against: whether its Drift or difference is still open, its references, how many fix options it has and the Proposal attached to it. */
interface Subject {
  open: boolean;
  refs: string[];
  options: number;
  proposal: string | null;
}

/** Why a prepared question no longer holds, or null when it does. The code of the project plays no part, and nothing is deleted. */
function stalenessOf(p: Project, subject: Subject, value: PreparedQuestion, project: ProjectModel): string | null {
  if (!subject.open) return "the Drift is resolved";
  if (referencesFingerprint(project, subject.refs) !== value.fingerprint) return "Model or Requirements changed";
  if (value.decisions.some((d) => d.decision === "fix-code" && d.option > subject.options)) return "a fix option no longer exists";
  if (value.decisions.some((d) => d.decision === "proposal")) {
    const attached = subject.proposal === null ? null : getProposalOrNull(p, subject.proposal);
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
  const reason = stalenessOf(p, { open: drift.data.status === "open", refs: drift.data.refs, options: driftOptions(drift).length, proposal: drift.data.proposal }, read, project);
  return reason === null ? { state: "valid", value: read } : { state: "stale", value: read, reason };
}

/** The prepared question of one open difference of a unified Drift, with whether it holds; `status` is null when the round has none for it (an unreadable section counts as absent). */
export interface RoundQuestionStatus {
  difference: string;
  status: PreparedStatus | null;
}

/**
 * The prepared round of a unified Drift with differences: one entry per open difference, in order, each question valid or not on its own
 * (its difference open, the fingerprint of the text of the Model and the Requirements on that difference's refs, its fix options, the Proposal
 * attached to that difference). Empty for a Drift without differences. The entries of decided differences no longer count.
 */
export function preparedRound(p: Project, drift: Drift, project: ProjectModel = loadProject(p)): RoundQuestionStatus[] {
  const round = readPreparedRound(drift);
  return openDifferences(drift).map((difference): RoundQuestionStatus => {
    const entry = round === null || round === "unreadable" ? undefined : round.find((e) => e.difference === difference.drift);
    if (entry === undefined) return { difference: difference.drift, status: null };
    if (entry.value === "unreadable") return { difference: difference.drift, status: { state: "unreadable" } };
    const reason = stalenessOf(p, { open: drift.data.status === "open", refs: difference.refs, options: driftOptions(drift, difference.drift).length, proposal: difference.proposal }, entry.value, project);
    return { difference: difference.drift, status: reason === null ? { state: "valid", value: entry.value } : { state: "stale", value: entry.value, reason } };
  });
}

/** `{ valid }` for a Drift's prepared question or round, null for none: a round holds when every open difference has a valid question. What `list`, `show`, the Snapshot and `--json` carry. */
export function preparedFlagOf(p: Project, drift: Drift, project: ProjectModel = loadProject(p)): { valid: boolean } | null {
  if (!hasDifferences(drift)) return preparedFlag(preparedStatus(p, drift, project));
  const round = preparedRound(p, drift, project);
  return round.every((q) => q.status === null || q.status.state === "unreadable") ? null : { valid: round.every((q) => q.status?.state === "valid") };
}

/** The open Drifts among `drifts` that have no valid prepared question (a unified Drift with differences: a valid question for every open difference) and are in no resolution being written or open. */
export function unpreparedDrifts(p: Project, drifts: Drift[]): Drift[] {
  const project = loadProject(p);
  const held = new Set(listProposals(p).filter((r) => r.data.kind === "resolution" && (r.data.status === "draft" || r.data.status === "open")).flatMap((r) => r.data.drifts.map((d) => d.drift)));
  return drifts.filter((d) => d.data.status === "open" && !held.has(d.id) && preparedFlagOf(p, d, project)?.valid !== true);
}

/** What `drift edit` takes as `prepared` for a Drift without differences: the question and a decision for each option. */
export interface PreparedInput {
  question: unknown;
  decisions: unknown;
}

/** What `drift edit` takes as `prepared` for a unified Drift with differences: the questions to write or replace, each about one open difference (its `drift`, as a permanent identity or short number); the others are kept. */
export interface PreparedRoundInput {
  questions: unknown;
}

/** What `drift edit` takes as `proposal` for a unified Drift with differences: the Proposal to attach to one difference. */
export interface DifferenceProposalInput {
  difference: string;
  proposal: string;
}

/** A refusal that names the field of the input it is about. */
const refuse = (field: string, message: string) => new UsageError(`${field}: ${message}`);

/** The question of an input, parsed by the rules of `trama question new` with its errors renamed to `field`. `subject` says what its `id` must be. */
function checkQuestion(id: string, question: unknown, field: string, subject: string): Question {
  let parsed: Question;
  try {
    parsed = parseQuestionRequest({ questions: [question] }).questions[0] as Question;
  } catch (error) {
    if (error instanceof UsageError) throw refuse(field, error.message.replace(/^questions\[0\]\.?/, "").replace(/^request\.questions/, "questions"));
    throw error;
  }
  if (parsed.id !== id) throw refuse(`${field}.id`, `must be ${subject} ${id}`);
  if (parsed.multi) throw refuse(`${field}.multi`, "must be false");
  return parsed;
}

/**
 * The decisions of an input, checked against the question and the `fixOptions` the Drift (or difference) has: one for each option, the `fix-code`
 * ones naming each fix option once, and with fix options exactly one `proposal` or `dismissed` more; without fix options both, once.
 */
function checkDecisions(fixOptions: number, question: Question, decisions: unknown, hasProposal: boolean, field: string): PreparedDecision[] {
  if (!Array.isArray(decisions)) throw refuse(field, "must be a list with a decision for each option");
  if (decisions.length !== question.options.length) throw refuse(field, `needs one decision for each of the ${question.options.length} options, found ${decisions.length}`);
  const read = decisions.map((d, i) => {
    const decision = readDecision(d);
    if (decision === null) throw refuse(`${field}[${i}]`, 'must be {"decision":"fix-code","option":<number from 1>}, {"decision":"proposal"} or {"decision":"dismissed"}');
    return decision;
  });
  const fixed = read.flatMap((d) => (d.decision === "fix-code" ? [d.option] : []));
  const missing = Array.from({ length: fixOptions }, (_, i) => i + 1).filter((n) => !fixed.includes(n));
  const unknown = fixed.find((n) => n > fixOptions);
  if (unknown !== undefined) throw refuse(field, `fix option ${unknown} does not exist: the Drift has ${fixOptions}`);
  if (new Set(fixed).size !== fixed.length) throw refuse(field, "a fix option is named more than once");
  if (missing.length > 0) throw refuse(field, `every fix option needs a decision: missing ${missing.join(", ")}`);
  const proposals = read.filter((d) => d.decision === "proposal").length;
  const dismissals = read.filter((d) => d.decision === "dismissed").length;
  if (fixOptions === 0 ? proposals !== 1 || dismissals !== 1 : proposals + dismissals !== 1)
    throw refuse(field, fixOptions === 0 ? 'a Drift without fix options needs exactly one "proposal" and one "dismissed"' : 'besides the fix options, exactly one "proposal" or "dismissed" is needed');
  if (proposals > 0 && !hasProposal) throw refuse(field, 'a "proposal" decision needs an attached Proposal: attach one with "proposal"');
  return read;
}

/** A Drift from a merge recommends the behaviour the code already has: never a fix of the code, and adopting the attached Proposal when there are no fix options. */
function checkMergeRecommendation(merge: boolean, noFixOptions: boolean, recommended: PreparedDecision["decision"] | undefined, field: string): void {
  if (merge && (recommended === "fix-code" || (noFixOptions && recommended !== "proposal")))
    throw refuse(field, noFixOptions ? "a Drift from a merge recommends adopting the attached Proposal" : 'a Drift from a merge recommends the behaviour the code already has (a "proposal" or "dismissed" decision), not a fix of the code');
}

/**
 * `trama drift edit`: attaches a Proposal to an open Drift that has none and/or prepares its question. A unified Drift with differences takes
 * `prepared` as `{ questions }`, one question for each difference to write or replace (the others stay), and `proposal` as `{ difference, proposal }`;
 * the other Drifts take `{ question, decisions }` and the identity of a Proposal. Everything is checked before anything is written; a refusal is a usage
 * error naming the field and changes nothing. Returns the Drift as written.
 */
export function editDrift(p: Project, id: string, input: { prepared?: PreparedInput | PreparedRoundInput; proposal?: string | DifferenceProposalInput }): Drift {
  if (input.prepared === undefined && input.proposal === undefined) throw new UsageError("Give at least one of `prepared` and `proposal`");
  const drift = getDrift(p, id, true);
  if (drift.data.status !== "open") throw new UsageError(`Drift ${cardName(p, "drift", drift.id)} is already resolved: only an open Drift can be edited`);
  if (hasDifferences(drift)) return editDifferences(p, drift, input);
  const { prepared, proposal } = input;
  if (prepared !== undefined && "questions" in prepared) throw refuse("prepared.questions", "only a unified Drift with differences takes a question for each difference: give `question` and `decisions`");
  if (proposal !== undefined && typeof proposal !== "string") throw refuse("proposal.difference", "only a unified Drift with differences has differences: give the Proposal's ID");
  let attached = drift.data.proposal;
  if (proposal !== undefined) {
    try {
      attached = checkAttachment(p, drift, proposal).id;
    } catch (error) {
      if (error instanceof TramaError) throw refuse("proposal", error.message);
      throw error;
    }
  }
  let body: string | null = null;
  if (prepared !== undefined) {
    const question = checkQuestion(drift.id, prepared.question, "prepared.question", "the Drift's permanent identity");
    const decisions = checkDecisions(driftOptions(drift).length, question, prepared.decisions, attached !== null, "prepared.decisions");
    checkMergeRecommendation(drift.data.merge, driftOptions(drift).length === 0, decisions[question.recommended]?.decision, "prepared.question.recommended");
    const value: PreparedQuestion = { question, decisions, fingerprint: referencesFingerprint(loadProject(p), drift.data.refs), prepared: new Date().toISOString() };
    body = withPreparedSection(drift, JSON.stringify(value, null, 2));
  }
  drift.data.proposal = attached;
  if (body !== null) drift.body = body;
  saveDrift(drift);
  return drift;
}

/** `editDrift` for a unified Drift with differences. */
function editDifferences(p: Project, drift: Drift, input: { prepared?: PreparedInput | PreparedRoundInput; proposal?: string | DifferenceProposalInput }): Drift {
  const { prepared, proposal } = input;
  if (prepared !== undefined && !("questions" in prepared)) throw refuse("prepared.question", "a unified Drift with differences takes `prepared.questions`, one question for each difference");
  if (proposal !== undefined && typeof proposal === "string") throw refuse("proposal", "a unified Drift with differences takes { difference, proposal }");
  const name = cardName(p, "drift", drift.id);
  const open = (arg: string, field: string): Difference => {
    let identity: string;
    try {
      identity = getDrift(p, arg, true).id;
    } catch (error) {
      throw refuse(field, error instanceof TramaError ? error.message : `Drift ${arg} cannot be read`);
    }
    const found = differenceOf(drift, identity);
    if (found === null) throw refuse(field, `${cardName(p, "drift", identity)} is not a difference of Drift ${name}`);
    if (found.decision !== null) throw refuse(field, `the difference of ${cardName(p, "drift", identity)} is already decided`);
    return found;
  };
  const attached = new Map(drift.data.differences.map((d) => [d.drift, d.proposal]));
  if (proposal !== undefined) {
    const target = open(proposal.difference, "proposal.difference");
    try {
      attached.set(target.drift, checkDifferenceAttachment(p, drift, target.drift, proposal.proposal).id);
    } catch (error) {
      if (error instanceof TramaError) throw refuse("proposal.proposal", error.message);
      throw error;
    }
  }
  let body: string | null = null;
  if (prepared !== undefined) {
    const { questions } = prepared as PreparedRoundInput;
    if (!Array.isArray(questions) || questions.length === 0) throw refuse("prepared.questions", "must be a list with a question for each difference to prepare");
    const project = loadProject(p);
    const all = indexDrifts(listDrifts(p));
    const written = new Map<string, RoundSave>();
    questions.forEach((entry: unknown, i) => {
      const field = `prepared.questions[${i}]`;
      if (!isObject(entry) || typeof entry["difference"] !== "string") throw refuse(field, "must be { difference, question, decisions }");
      const target = open(entry["difference"], `${field}.difference`);
      if (written.has(target.drift)) throw refuse(`${field}.difference`, `the difference of ${cardName(p, "drift", target.drift)} is named more than once`);
      const question = checkQuestion(target.drift, entry["question"], `${field}.question`, "the permanent identity of the difference");
      const fixOptions = driftOptions(drift, target.drift).length;
      const decisions = checkDecisions(fixOptions, question, entry["decisions"], attached.get(target.drift) !== null, `${field}.decisions`);
      checkMergeRecommendation(all.get(target.drift)?.data.merge ?? false, fixOptions === 0, decisions[question.recommended]?.decision, `${field}.question.recommended`);
      written.set(target.drift, { difference: target.drift, question, decisions, fingerprint: referencesFingerprint(project, target.refs) });
    });
    // The questions not replaced stay, those of decided differences too; one that does not read is dropped.
    const kept = readPreparedRound(drift);
    const keptEntries = kept === null || kept === "unreadable" ? [] : kept.flatMap((e) => (e.value === "unreadable" || written.has(e.difference) ? [] : [{ difference: e.difference, question: e.value.question, decisions: e.value.decisions, fingerprint: e.value.fingerprint }]));
    const byDifference = new Map<string, RoundSave>([...keptEntries.map((e): [string, RoundSave] => [e.difference, e]), ...written]);
    const questionsInOrder = drift.data.differences.flatMap((d) => (byDifference.has(d.drift) ? [byDifference.get(d.drift) as RoundSave] : []));
    body = withPreparedSection(drift, JSON.stringify({ questions: questionsInOrder, prepared: new Date().toISOString() }, null, 2));
  }
  for (const difference of drift.data.differences) difference.proposal = attached.get(difference.drift) ?? null;
  if (body !== null) drift.body = body;
  saveDrift(drift);
  return drift;
}

/** One question of the round as `drift edit` writes it. */
interface RoundSave {
  difference: string;
  question: Question;
  decisions: PreparedDecision[];
  fingerprint: string;
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

/** One valid question of the round Resolve opens for a unified Drift with differences: the difference it is about and the question as prepared. */
export interface RoundQuestion {
  difference: string;
  value: PreparedQuestion;
}

/** The valid questions of a unified Drift's round, in the order of the differences, and whether every open difference has one. A Drift without differences or without open ones has none. */
export interface ReadyRound {
  questions: RoundQuestion[];
  complete: boolean;
}

/** The questions of the round that still hold: Resolve opens them all at once when `complete`, and launches the agent, which keeps them, otherwise. */
export function readyRound(p: Project, drift: Drift, project: ProjectModel = loadProject(p)): ReadyRound {
  const round = preparedRound(p, drift, project);
  const questions = round.flatMap((q): RoundQuestion[] => (q.status?.state === "valid" ? [{ difference: q.difference, value: q.status.value }] : []));
  return { questions, complete: round.length > 0 && questions.length === round.length };
}

/**
 * The Drift a prepared question belongs to, from its `id`: the open unified Drift that has a difference with that `drift`, otherwise the Drift
 * with that identity (the question's own). Asking more about a question of a round finds the unified Drift this way.
 */
export function preparedQuestionDrift(p: Project, id: string): Drift {
  return listDrifts(p).find((d) => d.data.status === "open" && d.data.differences.some((x) => x.drift === id)) ?? getDrift(p, id);
}

/** The answer to a question of the round as the agent receives it: the labels chosen and the free text, if any. */
export interface GivenAnswer {
  selected: string[];
  text?: string;
}

/**
 * What the answers to the round of a unified Drift lead to: a resolution Trama writes itself with one decision for each difference
 * answered, the Drift's resolution agent with all the answers (by difference) and `linked` when linked differences got different
 * decisions, or nothing. The differences skipped or without an answer take no part, and no recommendation applies to them.
 */
export type PreparedRoundOutcome =
  /** `given` are the answers as the agent would get them, for when the hand-over of the written resolution is refused. */
  | { kind: "write"; answers: { difference: string; answer: PreparedAnswer }[]; given: Record<string, GivenAnswer> }
  | { kind: "agent"; answers: Record<string, GivenAnswer>; linked: boolean }
  | { kind: "none" };

/**
 * Reads the answers to the questions of a round, each by `preparedOutcome`. Trama writes the resolution when at least one question is
 * answered, every answered one is a Fix option or a plain `dismissed` or `proposal`, and no two linked differences got different decisions
 * (a `fix-code` with any option is one decision); otherwise the agent gets every answer. All skipped leads to nothing.
 * `answers` are keyed by the question id, which is the `drift` of the difference.
 */
export function preparedRoundOutcome(drift: Drift, questions: readonly RoundQuestion[], answers: Readonly<Record<string, QuestionAnswer | undefined>>): PreparedRoundOutcome {
  const given: Record<string, GivenAnswer> = {};
  const decided: { difference: string; answer: PreparedAnswer }[] = [];
  let needsAgent = false;
  for (const { difference, value } of questions) {
    const answer = answers[value.question.id];
    const outcome = preparedOutcome(value, answer);
    if (outcome.kind === "none" || answer?.status !== "answered") continue;
    given[difference] = { selected: answer.selected, ...(answer.text?.trim() ? { text: answer.text } : {}) };
    if (outcome.kind === "write") decided.push({ difference, answer: outcome.answer });
    else needsAgent = true;
  }
  if (Object.keys(given).length === 0) return { kind: "none" };
  const linked = decided.some((a, i) => decided.slice(i + 1).some((b) => a.answer.decision !== b.answer.decision && differenceOf(drift, a.difference)?.linked.includes(b.difference) === true));
  return needsAgent || linked ? { kind: "agent", answers: given, linked } : { kind: "write", answers: decided, given };
}
