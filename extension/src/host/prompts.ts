import type { AgentAction, RunGroup } from "../protocol";
import type { Question } from "../../../src/core/questions";

/** An action whose free text has been collected. */
export type ResolvedAction =
  | Exclude<AgentAction, { kind: "resolve-drifts" | "unify-drifts" }>
  /** A written design request, saved as `.trama/requests/<request>.md`. */
  | { kind: "written-design"; request: string }
  /** A written design request that starts a project from scratch: the `trama-setup` skill, named `Setup`. */
  | { kind: "setup-request"; request: string }
  /** Resolve Drifts on the one Drift the developer chose: always a manual request, answered with a round of questions. */
  | { kind: "resolve-drifts"; drift: string }
  /** Unify Drifts on the `drifts` gathered when the instruction is sent, in creation order: one agent unites them into one Drift. */
  | { kind: "unify-drifts"; drifts: string[] }
  /** Rework with feedback on a rejected Proposal, redone with the `skill` that wrote it: `design` (change, or setup on a Model that has a Feature or an Actor), `setup` (setup on an empty Model) or `import`. */
  | { kind: "rework"; proposal: string; skill: "design" | "setup" | "import" }
  /** Rework with feedback on a rejected resolution: one agent resolves its `drifts`, the ones still open and in no other resolution. */
  | { kind: "rework-resolution"; proposal: string; drifts: string[] }
  /** Refine a stale Proposal on the current Model and Requirements (`trama.autoUpdateStaleProposals`). `seats`: the sub-agent places this refinement holds, the limit its instruction gives. `job`: the identity of its job, kept in memory to tell its end from another's. */
  | { kind: "refine"; proposal: string; seats: number; job: string };

/** The one-line instruction that makes the external agent use the right Trama skill. */
export function buildPrompt(action: ResolvedAction): string {
  switch (action.kind) {
    case "setup-request":
      return `Use the trama-setup skill on the project request in \`.trama/requests/${action.request}.md\`. Bind the setup Proposal you open to it with the \`request\` field.`;
    case "written-design":
      return `Use the trama-design skill on the design request in \`.trama/requests/${action.request}.md\`. Bind the first Proposal you open to it with the \`request\` field.`;
    case "resolve-drifts":
      return `Use the trama-resolve-drifts skill on the open Drift ${action.drift}, and on no other open Drift: ask the developer what should happen for it, then write one resolution Proposal.`;
    case "unify-drifts":
      return `Unify the open Drifts ${action.drifts.map((d) => `\`${d}\``).join(", ")} into one Drift, following the instructions above.`;
    case "rework":
      return action.skill === "setup"
        ? `Use the trama-setup skill to rework the rejected setup Proposal ${action.proposal} with the developer's feedback. Bind the setup Proposal you open to it with the \`reworks\` field.`
        : `Use the trama-${action.skill} skill to rework the rejected Proposal ${action.proposal} with the developer's feedback. Bind the first Proposal you open to it with the \`reworks\` field.`;
    case "refine":
      return `Use the trama-design skill to refine the stale Proposal ${action.proposal} on the current Model and Requirements, as the "Refining a stale Proposal" section says.`;
    case "rework-resolution":
      return `Use the trama-resolve-drifts skill to rework the rejected resolution ${action.proposal} with the developer's feedback, on the Drifts ${action.drifts.map((d) => `\`${d}\``).join(", ")}. Bind the resolution you open to it with the \`reworks\` field.`;
    case "scan":
      return "Use the trama-scan skill on the whole System.";
    case "implement":
      return `Use the trama-implement skill on Task ${action.task}.`;
    case "implement-all":
      return runAllPrompt(action.group);
    case "import":
      return importPrompt(action.excluded);
  }
}

/**
 * The import instruction. With `excluded` (the paths the developer left out in the setup wizard, empty for none) it ends with the sentence that
 * tells the agent which paths to leave out, or that every folder is imported, and not to ask which folders to import; without it the instruction
 * says nothing about folders and the skill asks.
 */
export function importPrompt(excluded?: readonly string[]): string {
  const base = "Use the trama-import skill on this repository.";
  if (excluded === undefined) return base;
  return excluded.length === 0
    ? `${base} Import every folder and do not ask which folders to import.`
    : `${base} Do not import these paths and do not ask which folders to import: ${excluded.map((path) => `\`${path}\``).join(", ")}.`;
}

/** The Run all instruction: the plain one, or, for a group cut by Proposal, the one that names its Proposals and the filters `trama task list` takes them by. */
function runAllPrompt(group: RunGroup | undefined): string {
  const include = group?.include ?? [];
  const exclude = group?.exclude ?? [];
  const named = (ids: string[]) => `${ids.length === 1 ? "the Proposal" : "the Proposals"} ${ids.map((id) => `\`${id}\``).join(", ")}`;
  const list = (field: "proposals" | "notProposals", ids: string[]) => `\`trama task list --input '{"runnable":true,"${field}":[${ids.map((id) => `"${id}"`).join(",")}],"max":{maxParallelAgents}}'\``;
  if (include.length > 0)
    return `Use the trama-implement skill on every Task in the "todo" column that belongs to ${named(include)}. Take them from ${list("proposals", include)}, one group at a time, until it says there is none.`;
  if (exclude.length > 0)
    return `Use the trama-implement skill on every Task in the "todo" column except those of ${named(exclude)}. Take them from ${list("notProposals", exclude)}, one group at a time, until it says there is none.`;
  return 'Use the trama-implement skill on every Task in the "todo" column. Take them from `trama task list --input \'{"runnable":true,"max":{maxParallelAgents}}\'`, one group at a time, until it says there is none.';
}

/** The name of a Run all terminal: `All tasks` for the Settings group, `All tasks · <model>` for a sequence group, its model as written, trimmed. */
export function runTerminalName(model?: string): string {
  const name = model?.trim() ?? "";
  return name === "" ? "All tasks" : `All tasks · ${name}`;
}

/**
 * The name of the agent terminal that receives `action`'s instruction: the short number of the Task to implement, as
 * `short` gives it in this working copy (short number while live, else permanent identity), or a fixed English word.
 * A free terminal is reused only for the same name.
 */
export function terminalName(action: ResolvedAction, short: (kind: "task" | "proposal", id: string) => string): string {
  switch (action.kind) {
    case "implement":
      return short("task", action.task);
    case "implement-all":
      return runTerminalName(action.group?.model);
    case "import":
      return "Import";
    case "scan":
      return "Scan";
    case "written-design":
      return "Design";
    case "setup-request":
      return "Setup";
    case "resolve-drifts":
    case "rework-resolution":
      return "Drifts";
    case "unify-drifts":
      return "Unify";
    case "rework":
      return action.skill === "design" ? "Design" : action.skill === "setup" ? "Setup" : "Import";
    case "refine":
      return `Refine ${short("proposal", action.proposal)}`;
  }
}

/** The sentence a chosen language (`trama.language`) adds: `language` is the setting's text, trimmed, as typed. */
export const languageSentence = (language: string): string => `Write the texts for the developer in ${language}, as the Language section of your instructions says.`;

/**
 * Ends an instruction with the request to write in `language` (`trama.language`), on the same line. Empty or blank text
 * asks nothing, so the instruction is exactly as built. The language is used trimmed, as typed.
 */
export function withLanguage(prompt: string, language: string): string {
  const typed = language.trim();
  return typed === "" ? prompt : `${prompt} ${languageSentence(typed)}`;
}

/** The sentence the Async Drift Resolver adds to the instructions that may file Drifts (`trama.asyncDriftResolver`). */
export const ASYNC_DRIFT_RESOLVER_SENTENCE = "The Async Drift Resolver is on: before finishing, prepare the resolution question of every Drift filed in this job, as your skill says.";

/** The sentence Context Sharing adds to every instruction that carries the sub-agent limit (`trama.subagentsContextSharing`). */
export const CONTEXT_SHARING_SENTENCE =
  'The sub-agents context sharing is on: pass each sub-agent what you have already read that concerns its part, as the "Sub-agents context sharing" section of your skill says.';

/** The sentence that follows the Resolve instruction when the developer gave feedback on how to resolve the Drift, followed by the feedback in quotes. */
export const REWORK_FEEDBACK_SENTENCE = "The developer's feedback on how to resolve it:";

/** The Rework instruction for one Drift: exactly the Resolve instruction when `feedback` is empty after trimming, otherwise followed on the same line by the feedback as typed, without the spaces around it. */
export function reworkPrompt(drift: string, feedback: string): string {
  const text = feedback.trim();
  const base = buildPrompt({ kind: "resolve-drifts", drift });
  return text === "" ? base : `${base} ${REWORK_FEEDBACK_SENTENCE} "${text}"`;
}

/** The sentence that hands the resolution agent the developer's answer to a Drift's prepared question, followed by the answer as JSON and a full stop. */
export const PREPARED_ANSWER_SENTENCE = "The developer already answered this Drift's prepared question; do not ask again. Answer:";

/** The sentence the parallel execution adds to the instruction of a run over several Tasks (`trama.parallelExecution`). */
export const PARALLEL_EXECUTION_SENTENCE = 'The parallel execution is on: follow the "Parallel execution" section of the trama-implement skill.';

/** The sentence every instruction carries: the agent asks the developer only through `trama question new`, never with its own question tool. */
export const ASK_DEVELOPER_SENTENCE = "Ask the developer only with `trama question new`, as the skill says, never with your own question tool; run it with no time limit and wait until it ends.";

/** The sentence an instruction with a hooked job carries when `trama.autoExit` is on: the terminal closes as soon as the agent finishes, so its final report would go unread. */
export const AUTO_EXIT_SENTENCE = "Trama closes this session as soon as you finish: end with one short line at most, with no summary or report.";

/** Whether the instruction for `action` lets the agent file Drifts: scans, implementations, imports and Unify Drifts do; designs and Resolve Drifts do not. */
export function mayFileDrifts(action: ResolvedAction): boolean {
  switch (action.kind) {
    case "scan":
    case "implement":
    case "implement-all":
    case "import":
    case "unify-drifts":
      return true;
    case "written-design":
    case "setup-request":
    case "resolve-drifts":
    case "refine":
    case "rework-resolution":
      return false;
    case "rework":
      return action.skill === "import";
  }
}

/** Ends an instruction with the Async Drift Resolver's sentence, on the same line, when `on`; otherwise the instruction is exactly as built. */
export function withAsyncDriftResolver(prompt: string, on: boolean): string {
  return on ? `${prompt} ${ASYNC_DRIFT_RESOLVER_SENTENCE}` : prompt;
}

/** Ends an instruction with the Context Sharing sentence, on the same line, when `on`; otherwise the instruction is exactly as built. */
export function withContextSharing(prompt: string, on: boolean): string {
  return on ? `${prompt} ${CONTEXT_SHARING_SENTENCE}` : prompt;
}

/** The text a conversation's first message goes as when Trama's instruction comes with it (Ask more, General's fallback): the instruction, then the developer's message as written. */
export function instructedMessage(instruction: string, message: string): string {
  return `Instructions from Trama (not written by the developer):\n${instruction}\n\nDeveloper's message:\n${message}`;
}

/** A card or a question Ask more is about, read when the developer presses it. Every identity is permanent; `number` is the short number of the card in this working copy, for the developer only. */
export interface AskMoreLink {
  id: string;
  title: string;
}

export type AskMoreSubject =
  | { kind: "task"; id: string; number: string; title: string; body: string; refs: string[]; images: string[]; proposal: AskMoreLink | null; drift: AskMoreLink | null }
  | { kind: "proposal"; id: string; number: string; title: string; status: string; proposalKind: string; body: string; tasks: (AskMoreLink & { refs: string[] })[]; drifts: (AskMoreLink & { decision: string | null; option: number | null })[] }
  | { kind: "drift"; id: string; number: string; title: string; status: string; happens: string; should: string; where: string | null; refs: string[]; proposal: AskMoreLink | null; task: AskMoreLink | null; previous: AskMoreLink[]; unifies: AskMoreLink[] }
  /** A question of an open round: the one in view in full, then every question of the round. `drift` is set for the prepared question of a Drift. */
  | { kind: "question"; question: Question; round: Question[]; drift: AskMoreLink | null };

const commandText = (command: string) => `\`${command}\``;
const linkText = (link: AskMoreLink) => `\`${link.id}\` — ${link.title}`;
const listOrNone = (items: string[]) => (items.length === 0 ? "none" : items.map((item) => `- ${item}`).join("\n"));
const refsText = (refs: string[]) => (refs.length === 0 ? "none" : refs.map((ref) => `\`${ref}\``).join(", "));
const modelReads = (refs: string[]) => refs.map((ref) => commandText(`trama model show ${ref}`));

/** The part of an Ask more instruction that describes the thing the developer chose, with the commands that read it. Never contains answers, choices or skips of a question. */
export function askMorePart(subject: AskMoreSubject): string {
  switch (subject.kind) {
    case "task": {
      const reads = [commandText(`trama task show ${subject.id}`), ...(subject.proposal ? [commandText(`trama proposal show ${subject.proposal.id}`)] : []), ...(subject.drift ? [commandText(`trama drift show ${subject.drift.id}`)] : []), ...modelReads(subject.refs)];
      return [
        `Ask more about the Task ${subject.id}: "${subject.title}". Its short number in this working copy is ${subject.number}, for the developer only: use the identity in every command.`,
        "",
        "The Task's text:",
        subject.body.trim() === "" ? "(no text)" : subject.body.trim(),
        "",
        `References: ${refsText(subject.refs)}`,
        `Images: ${subject.images.length === 0 ? "none" : subject.images.map((path) => `\`${path}\``).join(", ")}`,
        `Proposal it belongs to: ${subject.proposal ? linkText(subject.proposal) : "none"}`,
        `Drift it comes from: ${subject.drift ? linkText(subject.drift) : "none"}`,
        "",
        `Read with: ${reads.join(", ")}.`,
      ].join("\n");
    }
    case "proposal": {
      const reads = [commandText(`trama proposal show ${subject.id}`), ...subject.tasks.map((task) => commandText(`trama task show ${task.id}`)), ...subject.drifts.map((drift) => commandText(`trama drift show ${drift.id}`)), ...modelReads([...new Set(subject.tasks.flatMap((task) => task.refs))])];
      const decisions = subject.drifts.map((drift) => `${linkText(drift)}: ${drift.decision ?? "undecided"}${drift.option === null ? "" : ` (option ${drift.option})`}`);
      return [
        `Ask more about the Proposal ${subject.id}: "${subject.title}". Its short number in this working copy is ${subject.number}, for the developer only: use the identity in every command.`,
        `Status: ${subject.status}. Kind: ${subject.proposalKind}.`,
        "",
        "The Proposal's text:",
        subject.body.trim() === "" ? "(no text)" : subject.body.trim(),
        "",
        "Its Tasks:",
        listOrNone(subject.tasks.map(linkText)),
        ...(subject.proposalKind === "resolution" ? ["", "The Drifts it resolves, with the developer's decision:", listOrNone(decisions)] : []),
        "",
        `Read with: ${reads.join(", ")}.`,
      ].join("\n");
    }
    case "drift": {
      const reads = [commandText(`trama drift show ${subject.id}`), ...(subject.proposal ? [commandText(`trama proposal show ${subject.proposal.id}`)] : []), ...(subject.task ? [commandText(`trama task show ${subject.task.id}`)] : []), ...subject.previous.map((d) => commandText(`trama drift show ${d.id}`)), ...subject.unifies.map((d) => commandText(`trama drift show ${d.id}`)), ...modelReads(subject.refs)];
      return [
        `Ask more about the Drift ${subject.id}: "${subject.title}". Its short number in this working copy is ${subject.number}, for the developer only: use the identity in every command. Status: ${subject.status}.`,
        "",
        `What happens: ${subject.happens.trim() || "(not written)"}`,
        `What should happen: ${subject.should.trim() || "(not written)"}`,
        `Where in the code: ${subject.where?.trim() || "none"}`,
        `References: ${refsText(subject.refs)}`,
        "",
        `Proposal attached: ${subject.proposal ? linkText(subject.proposal) : "none"}`,
        `Task it comes from: ${subject.task ? linkText(subject.task) : "none"}`,
        `Drifts it follows: ${subject.previous.length === 0 ? "none" : subject.previous.map(linkText).join("; ")}`,
        `Drifts it unites: ${subject.unifies.length === 0 ? "none" : subject.unifies.map(linkText).join("; ")}`,
        "",
        `Read with: ${reads.join(", ")}.`,
      ].join("\n");
    }
    case "question": {
      const describe = (question: Question) => [
        `Question: ${question.question}`,
        ...(question.context ? [`Context: ${question.context}`] : []),
        `Choice: ${question.multi ? "several options may be chosen" : "one option"}`,
        "Options:",
        ...question.options.map((option, index) => `${index + 1}. ${option.label}${index === question.recommended ? " (recommended)" : ""}: ${option.description}${option.details ? ` Details: ${option.details}` : ""}`),
      ];
      return [
        "Ask more about a question of an open question round. The round is still open and the agent that asked it is still waiting: you do not answer it for the developer, and the developer answers it in Trama.",
        "",
        "The question in view:",
        ...describe(subject.question),
        "",
        "All the questions of the round, in order, the one in view marked (none of them is answered):",
        ...subject.round.map((item) => `- ${item.id === subject.question.id ? "(in view) " : ""}${item.question}${item.options.map((option) => ` [${option.label}: ${option.description}]`).join("")}`),
        ...(subject.drift === null ? [] : ["", `This is the prepared question of the Drift ${subject.drift.id} ("${subject.drift.title}"). Read it with ${commandText(`trama drift show ${subject.drift.id}`)}.`]),
      ].join("\n");
    }
  }
}
