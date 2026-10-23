import { TramaError } from "../../../src/core/errors";
import { getProposal, listProposals, type Proposal } from "../../../src/core/proposals";
import { cardName } from "../../../src/core/short-numbers";
import type { Project } from "../../../src/core/store";
import { attachedDrift, listTasks, type Task } from "../../../src/core/work";
import type { AppliedModel } from "./run-groups";
import type { RunModel } from "./terminal-agent";

/** The workspace state key of the models the developer chose for Proposals. */
export const PROPOSAL_MODELS_KEY = "trama.proposalModels";

/** The model chosen for a Proposal. */
export interface ProposalModel {
  model: string;
}

/** The models by Proposal identity. */
export type ProposalModels = Record<string, ProposalModel>;

/** The part of the workspace state the models live in; `vscode.Memento` fits it. */
export interface ModelMemory {
  get(key: string): unknown;
  update(key: string, value: unknown): Thenable<void>;
}

/** Only an entry of exactly `{ model }` counts: a non-empty model without spaces around it. An entry with any other field (an `agent` written by an earlier version) is invalid. */
function validEntry(value: unknown): value is { model: string } {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  if (Object.keys(value).join(",") !== "model") return false;
  const { model } = value as Record<string, unknown>;
  return typeof model === "string" && model !== "" && model === model.trim();
}

/** The models the developer chose, by Proposal identity. An entry of another shape is left out, and the next write drops it. */
export function proposalModels(memory: ModelMemory): ProposalModels {
  const raw = memory.get(PROPOSAL_MODELS_KEY);
  const models: ProposalModels = {};
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return models;
  for (const [id, value] of Object.entries(raw)) if (validEntry(value)) models[id] = { model: value.model };
  return models;
}

/**
 * Developer's choice for Proposal `id` (identity): `text` is the model name, trimmed; an empty text forgets the model and
 * the Settings roles apply again. Only an open Proposal that carries Tasks and is not attached to a Drift has a model to
 * choose. No project file changes: the choice lives in the workspace state only.
 */
export async function chooseProposalModel(memory: ModelMemory, p: Project, id: string, text: string): Promise<void> {
  const proposal = getProposal(p, id);
  const label = cardName(p, "proposal", proposal.id);
  if (proposal.data.status !== "open") throw new TramaError(`Refused: Proposal ${label} is ${proposal.data.status}, not waiting for the developer: only an open Proposal has a model to choose`);
  if (proposal.tasks.length === 0) throw new TramaError(`Refused: Proposal ${label} carries no Tasks: only a Proposal that carries Tasks has a model to choose`);
  const drift = attachedDrift(p, proposal.id);
  if (drift) throw new TramaError(`Refused: Proposal ${label} is attached to Drift ${cardName(p, "drift", drift.id)}: it has no model to choose`);
  const model = text.trim();
  const models = proposalModels(memory);
  if (model === "") delete models[proposal.id];
  else models[proposal.id] = { model };
  await memory.update(PROPOSAL_MODELS_KEY, models);
}

/** A Proposal keeps its model while it is a draft or open, and while it is approved with a Task of its design still to do or in progress. */
function keeps(proposal: Proposal | undefined, tasks: Task[]): boolean {
  if (!proposal) return false;
  if (proposal.data.status === "draft" || proposal.data.status === "open") return true;
  if (proposal.data.status !== "approved") return false;
  return tasks.some((task) => task.data.proposal === proposal.id && (task.data.column === "todo" || task.data.column === "doing"));
}

/**
 * Forgets the models of the Proposals that no longer exist, are rejected or discarded, or are approved with no Task of
 * their design in To do or In progress. Writes only when it forgets something.
 */
export async function forgetProposalModels(memory: ModelMemory, p: Project): Promise<void> {
  const models = proposalModels(memory);
  const ids = Object.keys(models);
  if (ids.length === 0) return;
  const proposals = new Map(listProposals(p).map((proposal) => [proposal.id, proposal]));
  const tasks = listTasks(p);
  const kept: ProposalModels = {};
  for (const id of ids) {
    const entry = models[id];
    if (entry && keeps(proposals.get(id), tasks)) kept[id] = entry;
  }
  if (Object.keys(kept).length === ids.length) return;
  await memory.update(PROPOSAL_MODELS_KEY, kept);
}

/** What the Board shows of one Proposal's model: the model chosen for it. */
export interface BoardProposalModel {
  name: string;
}

/**
 * The models of the Board: for each Proposal that carries Tasks (a key of `proposals`), the model chosen for it or null.
 * A Proposal without Tasks has no key: it has no model to choose.
 */
export interface BoardModels {
  proposals: Record<string, BoardProposalModel | null>;
}

/** The Board's models for the Proposals of its Backlog: `proposals` are the open Proposals the Board lists. */
export function boardModels(memory: ModelMemory, proposals: readonly { id: string; tasks: readonly unknown[] }[]): BoardModels {
  const chosen = proposalModels(memory);
  const byProposal: Record<string, BoardProposalModel | null> = {};
  for (const proposal of proposals) {
    if (proposal.tasks.length === 0) continue;
    const entry = chosen[proposal.id];
    byProposal[proposal.id] = entry === undefined ? null : { name: entry.model };
  }
  return { proposals: byProposal };
}

/** The Proposals that have a model chosen, with the model and the name a run takes it by (`Proposal <label>`). Read at the launch. */
export function appliedProposalModels(memory: ModelMemory, p: Project): AppliedModel[] {
  const chosen = proposalModels(memory);
  const applied: AppliedModel[] = [];
  for (const proposal of listProposals(p)) {
    const entry = chosen[proposal.id];
    if (entry === undefined) continue;
    applied.push({ id: proposal.id, run: { model: entry.model } });
  }
  return applied;
}

/**
 * The model a run of Proposal `proposalId` (null: none) uses in place of its role: the model chosen for it. Otherwise
 * undefined, and the Settings roles apply. Read once, at launch.
 */
export function proposalRunModel(memory: ModelMemory, p: Project, proposalId: string | null): RunModel | undefined {
  if (proposalId === null) return undefined;
  return appliedProposalModels(memory, p).find((entry) => entry.id === proposalId)?.run;
}
