import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { diffFile, type FileChange } from "./diff";
import { TramaError } from "./errors";
import { buildModel, formatDiagnostic } from "./model";
import { enumField, type Raw, stringList, stringMap } from "./schema";
import {
  findNumbered,
  listNumbered,
  modelDir,
  nextId,
  type Project,
  readDocument,
  readModelFiles,
  readTree,
  safeJoin,
  sha256,
  slugify,
  writeDocument,
  writeFileEnsuringDir,
} from "./store";
import type { Diagnostic, FileMap } from "./types";

export type ProposalStatus = "open" | "approved" | "rejected";

interface ProposalData {
  status: ProposalStatus;
  /** Model path -> sha256 of the file when the Proposal first touched it, or "new". */
  base: Record<string, string>;
  delete: string[];
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

const STATUSES: readonly ProposalStatus[] = ["open", "approved", "rejected"];

function parseData(raw: Raw, where: string): ProposalData {
  const data: ProposalData = {
    status: enumField(raw, "status", STATUSES, "open", where),
    base: stringMap(raw, "base", where),
    delete: stringList(raw, "delete", where),
  };
  for (const path of [...Object.keys(data.base), ...data.delete]) {
    try {
      normalizeModelPath(path);
    } catch (err) {
      throw new TramaError(`${where}: ${(err as Error).message}`);
    }
  }
  return data;
}

function load(p: Project, entry: { id: string; name: string }): Proposal {
  const dir = join(proposalsDir(p), entry.name);
  const file = join(dir, "proposal.md");
  const doc = readDocument(file);
  const title = /^#\s+(.+)$/m.exec(doc.body)?.[1]?.trim() ?? entry.name;
  return { id: entry.id, name: entry.name, dir, body: doc.body, title, data: parseData(doc.data, file) };
}

function save(proposal: Proposal) {
  writeDocument(join(proposal.dir, "proposal.md"), proposal.data, proposal.body);
}

export function listProposals(p: Project): Proposal[] {
  return listNumbered(proposalsDir(p)).map((e) => load(p, e));
}

export function getProposal(p: Project, id: string): Proposal {
  return load(p, findNumbered(proposalsDir(p), id, "Proposal"));
}

export function newProposal(p: Project, title: string, body = ""): Proposal {
  const id = nextId(proposalsDir(p));
  const name = `${id}-${slugify(title)}`;
  const proposal: Proposal = {
    id,
    name,
    dir: join(proposalsDir(p), name),
    title,
    data: { status: "open", base: {}, delete: [] },
    body: `# ${title}\n\n${body.trim()}\n`.replace(/\n\n\n$/, "\n"),
  };
  save(proposal);
  return proposal;
}

function normalizeModelPath(path: string): string {
  const clean = path.replace(/\\/g, "/").replace(/^\.\//, "").replace(/^\.trama\/model\//, "");
  if (!clean.endsWith(".md")) throw new TramaError(`"${path}" is not a Model file (expected a .md path under .trama/model/)`);
  if (clean.split("/").includes("..") || clean.startsWith("/")) throw new TramaError(`"${path}" must be relative to .trama/model/`);
  return clean;
}

function requireOpen(proposal: Proposal, action: string) {
  if (proposal.data.status !== "open")
    throw new TramaError(`Proposal ${proposal.id} is ${proposal.data.status}; only open Proposals can be ${action}`);
}

/**
 * Makes `modelPath` editable inside the Proposal and returns the file to edit.
 * Calling it again for the same file changes nothing.
 */
export function editInProposal(p: Project, id: string, modelPath: string): string {
  const proposal = getProposal(p, id);
  requireOpen(proposal, "edited");
  const rel = normalizeModelPath(modelPath);
  const target = safeJoin(join(proposal.dir, "model"), rel);
  if (proposal.data.delete.includes(rel)) throw new TramaError(`${rel} is marked for deletion in Proposal ${proposal.id}`);
  if (existsSync(target)) return target;

  const current = safeJoin(modelDir(p), rel);
  if (existsSync(current)) {
    const content = readFileSync(current, "utf8");
    proposal.data.base[rel] ??= sha256(content);
    writeFileEnsuringDir(target, content);
  } else {
    proposal.data.base[rel] ??= "new";
    writeFileEnsuringDir(target, "");
  }
  save(proposal);
  return target;
}

export function deleteInProposal(p: Project, id: string, modelPath: string) {
  const proposal = getProposal(p, id);
  requireOpen(proposal, "edited");
  const rel = normalizeModelPath(modelPath);
  const current = safeJoin(modelDir(p), rel);
  if (!existsSync(current)) throw new TramaError(`${rel} does not exist in the Model`);
  if (existsSync(safeJoin(join(proposal.dir, "model"), rel)))
    throw new TramaError(`${rel} is already edited in Proposal ${proposal.id}; remove that copy first`);
  proposal.data.base[rel] ??= sha256(readFileSync(current, "utf8"));
  if (!proposal.data.delete.includes(rel)) proposal.data.delete.push(rel);
  save(proposal);
}

export interface ProposalHealth {
  /** Touched files whose Model version changed since the Proposal recorded it. */
  stale: string[];
  /** Files in the Proposal with no recorded base; `proposal edit` records it. */
  unbased: string[];
}

const newFiles = (proposal: Proposal): FileMap => readTree(join(proposal.dir, "model"));

export function health(p: Project, proposal: Proposal): ProposalHealth {
  const model = readModelFiles(p);
  const touched = new Set([...newFiles(proposal).keys(), ...proposal.data.delete]);
  const stale: string[] = [];
  const unbased: string[] = [];
  for (const path of touched) {
    const base = proposal.data.base[path];
    if (base === undefined) {
      unbased.push(path);
      continue;
    }
    const now = model.get(path);
    const changed = base === "new" ? now !== undefined : now === undefined || sha256(now) !== base;
    if (changed) stale.push(path);
  }
  return { stale: stale.sort(), unbased: unbased.sort() };
}

/** The Model files as they would be once the Proposal is applied. */
export function applied(p: Project, proposal: Proposal): FileMap {
  const files = readModelFiles(p);
  for (const path of proposal.data.delete) files.delete(path);
  for (const [path, content] of newFiles(proposal)) files.set(path, content);
  return files;
}

export function validateProposal(p: Project, proposal: Proposal): Diagnostic[] {
  return buildModel(applied(p, proposal)).diagnostics;
}

export function changes(p: Project, proposal: Proposal): FileChange[] {
  const before = readModelFiles(p);
  const after = applied(p, proposal);
  const paths = [...new Set([...newFiles(proposal).keys(), ...proposal.data.delete])].sort();
  return paths.map((path) => diffFile(path, before.get(path), after.get(path)));
}

export function approveProposal(p: Project, id: string): Proposal {
  const proposal = getProposal(p, id);
  requireOpen(proposal, "approved");
  const h = health(p, proposal);
  if (h.stale.length > 0)
    throw new TramaError(`Proposal ${proposal.id} is stale: the Model changed since it touched ${h.stale.join(", ")}. Write a new Proposal.`);
  if (h.unbased.length > 0)
    throw new TramaError(`Proposal ${proposal.id} contains files it never registered: ${h.unbased.join(", ")}. Use "trama proposal edit" first.`);
  const errors = validateProposal(p, proposal);
  if (errors.length > 0)
    throw new TramaError(`Proposal ${proposal.id} would leave the Model invalid:\n${errors.map((d) => `- ${formatDiagnostic(d)}`).join("\n")}`);

  for (const path of proposal.data.delete) rmSync(safeJoin(modelDir(p), path));
  for (const [path, content] of newFiles(proposal)) writeFileEnsuringDir(safeJoin(modelDir(p), path), content);
  proposal.data.status = "approved";
  save(proposal);
  return proposal;
}

export function rejectProposal(p: Project, id: string, feedback: string): Proposal {
  const proposal = getProposal(p, id);
  requireOpen(proposal, "rejected");
  proposal.data.status = "rejected";
  proposal.body = `${proposal.body.trimEnd()}\n\n## Feedback\n\n${feedback.trim()}\n`;
  save(proposal);
  return proposal;
}
