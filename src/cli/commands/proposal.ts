import { z } from "zod";
import { requestExists } from "../../core/design-requests";
import { announcementNote } from "../../core/announcements";
import { TramaError, UsageError } from "../../core/errors";
import {
  approveProposal,
  checkedLabel,
  deleteInProposal,
  discardProposal,
  changeTaskImages,
  editInProposal,
  getProposal,
  createProposal,
  rebaseInProposal,
  rejectProposal,
  save,
  setProposalLabel,
  submitProposal,
  touch,
  warningsText,
  withProposalLock,
  type DriftDecisionKind,
} from "../../core/proposals";
import { filingOrigin, sendCoordinatorMessageSoon } from "../../core/question-channel";
import { resolveDriftInProposal } from "../../core/resolution";
import { syncShortNumbers } from "../../core/short-numbers";
import { loadModel } from "../../core/store";
import { getDrift, requireNotAttached } from "../../core/work";
import type { Context } from "../context";
import { defineCommand } from "../registry";
import { text } from "../result";
import { proposalListView, proposalShowView } from "../work";

const stringList = z.array(z.string().min(1));
const KINDS = ["change", "import", "resolution", "setup"] as const;
const DECISIONS = ["proposal", "dismissed", "fix-code"] as const;
const STATES = ["open", "approved", "rejected", "discarded"] as const;
const card = z.looseObject({ id: z.string(), number: z.string().nullable(), status: z.string() });
const RETURNED = "Proposal returned to Draft; hand it over again when finished.";

/** The short numbers of this working copy as they are now, read after a command has acted so a card it closed is already written by its identity. */
const numbersOf = (ctx: Context) => syncShortNumbers(ctx.project());

const create = defineCommand({
  object: "proposal",
  verb: "new",
  mode: "immediate",
  summary: "Create a Draft Proposal.",
  description:
    "Every new Proposal starts as a Draft; hand it over with `proposal move <id> open` when it is finished. `kind` is `change` (default), `import` (existing code), `resolution` (a resolution of Drifts) or `setup` (the first Proposal of an empty Model). `label` is the short label (1 to 30 characters, one line), required before a Proposal with Tasks is handed over. `requires` lists the Proposals it depends on. `nonBlocking` applies only to a resolution whose Drifts block no Task. `prepared` applies only to a resolution born from the answer to a Drift's prepared question. `announcement` is the ID printed by `trama announcement new`; `request` binds the Proposal to the written design request it comes from. `reworks` names the rejected Proposal this one redoes (Rework with feedback): when it exists, is rejected and is not already redone, the new Proposal takes its place (same creation instant) and replaces it in the `requires` of every Draft or open Proposal, which the result lists; otherwise the Proposal is created without the link and `reworksNote` says why. `reworks` and `request` cannot be given together.",
  input: z
    .strictObject({
      title: z.string().min(1).describe("A short title: at most five words."),
      body: z.string().optional().describe("The text of the Proposal, in Markdown."),
      kind: z.enum(KINDS).optional().describe("The kind of Proposal. Default `change`."),
      label: z.string().optional().describe("The short label of the Proposal: 1 to 30 characters, one line."),
      requires: stringList.optional().describe("The Proposals this one requires: IDs or short numbers."),
      nonBlocking: z.boolean().optional().describe("A resolution whose Drifts block no Task. Only with kind `resolution`."),
      prepared: z.boolean().optional().describe("A resolution born from the answer to a Drift's prepared question. Only with kind `resolution`."),
      announcement: z.string().min(1).optional().describe("The announcement of this Proposal."),
      request: z.string().min(1).optional().describe("The written design request this Proposal comes from."),
      reworks: z.string().min(1).optional().describe("The rejected Proposal this one redoes: ID or short number. Not with `request`."),
    })
    .superRefine((input, ctx) => {
      const fail = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });
      if (input.nonBlocking === true && input.kind !== "resolution") fail("nonBlocking", "applies only with kind resolution");
      if (input.prepared === true && input.kind !== "resolution") fail("prepared", "applies only with kind resolution");
      if (input.reworks !== undefined && input.request !== undefined) fail("reworks", "cannot be given together with request");
    }),
  output: card.extend({
    path: z.string(),
    request: z.string().nullable(),
    reworks: z.string().nullable().describe("The ID of the rejected Proposal now bound, or null."),
    note: z.string().optional().describe("About the announcement, when it was not known."),
    requestNote: z.string().optional().describe("About the design request, when it was not bound."),
    reworksNote: z.string().optional().describe("Why the Proposal does not redo the one named in `reworks`, when it was not bound."),
    requiresChanged: z.array(z.string()).optional().describe("The Draft or open Proposals whose `requires` now names this Proposal instead of the rejected one."),
  }),
  example: { title: "Order cancel", body: "# Order cancel\n\nA paid order can be cancelled.", label: "Order cancel", announcement: "a1b2c3d4" },
  effects: { writes: true, activity: true, editor: true },
  run(ctx, input) {
    const project = ctx.project();
    const kind = input.kind ?? "change";
    if (kind === "setup") {
      const model = loadModel(project);
      if (model.features.size > 0 || model.actors.size > 0) throw new UsageError('kind "setup" needs an empty Model: the Model is not empty (it has Features or Actors)');
    }
    const note = announcementNote(project, input.announcement, "proposal");
    let reworksCited = input.reworks;
    if (reworksCited !== undefined) {
      try {
        reworksCited = getProposal(project, reworksCited, true).id;
      } catch (err) {
        // A short number that names no live Proposal (or the wrong kind) is refused; any other text that names nothing only leaves the link out.
        if (/^[pPtTdD]\d+$/.test(reworksCited)) throw err;
      }
    }
    const { proposal: p, rework } = createProposal(project, input.title, input.body, {
      requires: (input.requires ?? []).map((id) => getProposal(project, id, true).id),
      kind,
      nonBlocking: input.nonBlocking === true,
      prepared: input.prepared === true,
      announcement: input.announcement,
      origin: ctx.origin,
      request: input.request,
      ...(reworksCited === undefined ? {} : { reworks: reworksCited }),
      ...(input.label === undefined ? {} : { label: input.label }),
    });
    const request = input.request;
    const requestNote = request !== undefined && p.data.request === null ? (requestExists(project, request) ? `Design request ${request} is already bound to another Proposal; the Proposal is not bound to any request.` : `Design request ${request} was not found; the Proposal is not bound to any request.`) : "";
    const notes = [note, requestNote, rework.note].filter(Boolean).join("\n");
    const n = numbersOf(ctx);
    const changed = rework.changed.length === 0 ? "" : `\nThe Proposals that required the rejected one now require this one: ${rework.changed.map((id) => n.name("proposal", id)).join(", ")}. They may be stale.`;
    return text(`Created Draft Proposal ${n.name("proposal", p.id)} at ${p.dir}. Hand it over when finished.${notes ? `\n${notes}` : ""}${changed}`, { id: p.id, number: n.label("proposal", p.id), path: p.dir, status: p.data.status, request: p.data.request, reworks: rework.reworks, ...(note ? { note } : {}), ...(requestNote ? { requestNote } : {}), ...(rework.note ? { reworksNote: rework.note } : {}), ...(rework.changed.length > 0 ? { requiresChanged: rework.changed } : {}) });
  },
});

const show = defineCommand({
  object: "proposal",
  verb: "show",
  mode: "immediate",
  summary: "A Proposal: staleness, structural changes, validation.",
  description: "The Proposal's text, its status, what it requires, the files it changes, its Tasks (each with the images tied to it, as `images` in `--json`), the scope it covers and the validation of the Model and Requirements with it applied. Read-only.",
  positionals: [{ name: "id", description: "The Proposal: its ID, a unique prefix or its short number." }],
  input: z.strictObject({}),
  output: card.extend({ title: z.string(), tasks: z.array(z.looseObject({ id: z.string(), images: z.array(z.string()).describe("The file names of the images tied to the Task; empty when it has none.") })).optional() }),
  exampleArgs: ["P3"],
  run: (ctx, _input, [id]) => proposalShowView(ctx.project(), getProposal(ctx.project(), id as string, true)),
});

const list = defineCommand({
  object: "proposal",
  verb: "list",
  mode: "immediate",
  summary: "Draft and open Proposals, or every one.",
  description: "Without `all`, only the Drafts and the open Proposals. Read-only.",
  input: z.strictObject({ all: z.boolean().optional().describe("Every Proposal, the decided ones included.") }),
  output: z.object({ proposals: z.array(card.extend({ title: z.string() })) }),
  example: { all: true },
  run: (ctx, input) => proposalListView(ctx.project(), input.all === true),
});

const driftDecision = z
  .strictObject({
    drift: z.string().min(1).describe("The Drift: its ID or short number."),
    decision: z.enum(DECISIONS).describe("`proposal`: the Model or Requirements change to match the code; `dismissed`; `fix-code`: the code is fixed."),
    option: z.number().int().min(1).optional().describe("Only with `fix-code`: the number of the chosen fix option, from 1."),
    note: z.string().optional().describe("Only with `fix-code`: a free note for the fix Task."),
  })
  .superRefine((input, ctx) => {
    if (input.decision === "fix-code") return;
    if (input.option !== undefined) ctx.addIssue({ code: "custom", path: ["option"], message: "applies only with decision fix-code" });
    if (input.note !== undefined) ctx.addIssue({ code: "custom", path: ["note"], message: "applies only with decision fix-code" });
  });

const IMAGES_RULES = "The file is copied into `.trama/task-images/<Task identity>/` (not versioned), and a change returns an open Proposal to Draft.";
const imageTask = z.string().min(1).describe("The Task: its full name `tasks/<identity>-<slug>.md` or the identity of a Task of the Proposal.");

const edit = defineCommand({
  object: "proposal",
  verb: "edit",
  mode: "immediate",
  summary: "Open a Proposal for writing: label, files and decisions on Drifts.",
  description:
    "Every use sends an open Proposal back to Draft and says so; hand it over again with `proposal move <id> open`. Without input it only returns an open Proposal to Draft, touching no file. `rebase` records again the starting version of each file the Proposal holds, so a stale Proposal is no longer stale, and marks the Draft refining until it is handed over again; only an ordinary change Proposal not attached to a Drift can be rebased. `label` writes or changes the short label. `edit` makes each path (a Model file, `specs.yaml`, a Requirement fragment such as `requirements/<area>/<fragment>.md`, or a Task as `tasks/<slug>.md`) editable inside the Proposal and prints the path to write for each; a new Task takes a new identity, and a Task is rewritten by the full name printed. `delete` marks each path for deletion. `drifts` records or replaces the decisions of a resolution on open Drifts, and `removeDrifts` takes Drifts out of its list. `images` ties images to the Tasks of the Proposal, a list of `{ task, path }` (`path` is a local `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp` or `.svg` file, absolute or relative to the project root), and `removeImages` takes them away, a list of `{ task, name }`. " + IMAGES_RULES,
  positionals: [{ name: "id", description: "The Proposal: its ID, a unique prefix or its short number." }],
  input: z.strictObject({
    label: z.string().optional().describe("The short label: 1 to 30 characters, one line."),
    rebase: z.boolean().optional().describe("Record again the starting version of each file the Proposal holds, so it is no longer stale; marks it refining until handed over again. Only an ordinary change Proposal not attached to a Drift."),
    edit: stringList.optional().describe("Paths to make editable inside the Proposal."),
    delete: stringList.optional().describe("Paths to mark for deletion."),
    drifts: z.array(driftDecision).optional().describe("The decisions to record on Drifts. Only in a resolution."),
    removeDrifts: stringList.optional().describe("Drifts to take out of the list: IDs or short numbers."),
    images: z.array(z.strictObject({ task: imageTask, path: z.string().min(1).describe("A local `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp` or `.svg` file, absolute or relative to the project root.") })).optional().describe("Images to tie to Tasks of the Proposal. " + IMAGES_RULES),
    removeImages: z.array(z.strictObject({ task: imageTask, name: z.string().min(1).describe("The name of the image file in the Task's folder.") })).optional().describe("Images to take away from Tasks of the Proposal."),
  }),
  output: card.extend({ returnedToDraft: z.boolean(), label: z.string().nullable(), paths: z.array(z.object({ path: z.string(), edit: z.string() })).describe("The path to write, for each path of `edit`."), drifts: z.array(z.looseObject({ drift: z.string() })), images: z.array(z.string()).describe("The path of each image copy made, in the order of `images`.") }),
  example: { edit: ["order/order.md", "tasks/cancel.md"], label: "Order cancel" },
  exampleArgs: ["P3"],
  effects: { writes: true, activity: true },
  run(ctx, input, [id]) {
    const project = ctx.project();
    if (input.label !== undefined) checkedLabel(input.label);
    const copies: string[] = [];
    const { proposalId, returnedToDraft, paths } = withProposalLock(
      project,
      id as string,
      (proposalId) => {
        const returnedToDraft = getProposal(project, proposalId).data.status === "open";
        const paths: { path: string; edit: string }[] = [];
        if (input.rebase === true) rebaseInProposal(project, proposalId);
        if (input.label !== undefined) setProposalLabel(project, proposalId, input.label);
        for (const path of input.edit ?? []) paths.push({ path, edit: editInProposal(project, proposalId, path) });
        for (const path of input.delete ?? []) deleteInProposal(project, proposalId, path);
        for (const d of input.drifts ?? []) resolveDriftInProposal(project, proposalId, getDrift(project, d.drift, true).id, { decision: d.decision as DriftDecisionKind, ...(d.option === undefined ? {} : { option: d.option }), ...(d.note === undefined ? {} : { note: d.note }) });
        for (const drift of input.removeDrifts ?? []) resolveDriftInProposal(project, proposalId, getDrift(project, drift, true).id, { remove: true });
        if (input.images !== undefined || input.removeImages !== undefined) copies.push(...changeTaskImages(project, proposalId, input.images ?? [], input.removeImages ?? []));
        const proposal = getProposal(project, proposalId);
        if (proposal.data.status === "open") {
          touch(proposal);
          save(proposal);
        }
        return { proposalId, returnedToDraft, paths };
      },
      true,
    );
    const proposal = getProposal(project, proposalId);
    const n = numbersOf(ctx);
    const lines = [...paths.map((p) => p.edit), ...(input.label === undefined ? [] : [`Label of Proposal ${n.name("proposal", proposalId)} is "${proposal.data.label}".`]), ...(input.delete ?? []).map((p) => `Marked ${p} for deletion.`), ...(input.drifts ?? []).map((d) => `Recorded Drift ${n.name("drift", getDrift(project, d.drift, true).id)} as ${d.decision}.`), ...(input.removeDrifts ?? []).map((d) => `Removed Drift ${d} from the list.`), ...copies.map((c) => `Image copied to ${c}`), ...(input.removeImages ?? []).map((r) => `Removed image ${r.name} from Task ${r.task}.`)];
    if (input.rebase === true) lines.unshift(`Rebased Proposal ${n.name("proposal", proposalId)} on the current Model; it is refining until handed over.`);
    if (lines.length === 0) lines.push(`Proposal ${n.name("proposal", proposalId)} is a Draft.`);
    return text(`${lines.join("\n")}${returnedToDraft ? `\n${RETURNED}` : ""}`, { id: proposalId, number: n.label("proposal", proposalId), status: proposal.data.status, returnedToDraft, label: proposal.data.label, paths, drifts: proposal.data.drifts, images: copies });
  },
});

const move = defineCommand({
  object: "proposal",
  verb: "move",
  mode: "immediate",
  summary: "Hand over, approve, reject or discard a Proposal.",
  description:
    "`open` hands a valid Draft over to the developer: it checks the Model and Requirements with the Proposal applied and prints the warnings and `proposal show` of the Proposal; a setup Proposal on an empty Model is approved at once. `approved` accepts an open Proposal and applies it in this folder. `rejected` rejects an open Proposal. `discarded` discards a Draft. Approving and rejecting a Proposal attached to an open Drift is refused: the decision is on the Drift. `skillsDir` (with `approved`, and with `open` for a setup Proposal) adds the configured skills folder where the `trama-req-*` skills are regenerated. `feedback` (only with `rejected`) is the text for the agent. Approving, rejecting and discarding are the developer's decisions.",
  positionals: [
    { name: "id", description: "The Proposal: its ID, a unique prefix or its short number." },
    { name: "state", description: "Where the Proposal goes.", choices: STATES },
  ],
  input: z.strictObject({
    skillsDir: z.string().min(1).optional().describe("The configured skills folder to regenerate, besides the ones found. Only toward `approved` or `open`."),
    feedback: z.string().optional().describe("The reason for the agent. Only toward `rejected`."),
  }),
  output: card.extend({ warnings: z.array(z.looseObject({})).optional(), show: z.string().optional().describe("Toward `open`: the text of `proposal show`."), resolved: z.array(z.looseObject({ drift: z.string() })).optional().describe("Toward `approved`: the Drifts a resolution decided.") }),
  example: { skillsDir: ".agents/skills" },
  exampleArgs: ["P3", "approved"],
  effects: { writes: true, activity: true, activityStates: ["open"], editor: true },
  run(ctx, input, [id, state]) {
    const project = ctx.project();
    if (input.skillsDir !== undefined && state !== "approved" && state !== "open") throw new UsageError(`skillsDir applies only toward approved or open, not ${state}`);
    if (input.feedback !== undefined && state !== "rejected") throw new UsageError(`feedback applies only toward rejected, not ${state}`);
    const proposalId = getProposal(project, id as string, true).id;
    const skillsDirs = input.skillsDir === undefined ? [] : [input.skillsDir];
    if (state === "open") {
      const p = submitProposal(project, proposalId, skillsDirs);
      // Approve and Reject wait for the end of the turn of the agent that delivered the Proposal; a Proposal approved at hand-over has nothing to wait for.
      const filed = filingOrigin(ctx.origin);
      if (ctx.byAgent && filed.holder !== undefined && !p.approvedAtHandOver)
        sendCoordinatorMessageSoon(project, { type: "proposal-delivered", root: project.root, proposal: p.id, ...filed }, (reason) => {
          process.stderr.write(`The editor did not learn that Proposal ${p.id} was delivered by an agent (${reason}); Approve and Reject are not held for that agent's turn.\n`);
        });
      const consumed = p.requestConsumed ? `\nDeleted design request ${p.data.request}: it is now consumed.` : "";
      const n = numbersOf(ctx);
      const head = p.approvedAtHandOver ? `Submitted and approved Proposal ${n.name("proposal", p.id)}` : `Submitted Proposal ${n.name("proposal", p.id)} for review`;
      const kept = p.openReason === null ? "" : `\nKept open for the developer: ${p.openReason}`;
      const shown = proposalShowView(project, getProposal(project, p.id, true));
      return text(`${head}${consumed}${kept}${warningsText(p.warnings)}\n\n${shown.md}`, { id: p.id, number: n.label("proposal", p.id), status: p.data.status, request: p.data.request, requestConsumed: p.requestConsumed, warnings: p.warnings, approvedAtHandOver: p.approvedAtHandOver, openReason: p.openReason, show: shown.md });
    }
    if (state === "approved") {
      requireNotAttached(project, proposalId);
      const { id: approved, resolved } = approveProposal(project, proposalId, skillsDirs);
      const n = numbersOf(ctx);
      const lines = resolved.map((d) => `- Drift ${n.name("drift", d.drift)}: ${d.skipped ? "skipped, already resolved" : d.decision === "fix-code" ? `code to be fixed, Task ${d.task ? n.name("task", d.task) : ""} created` : d.decision === "proposal" ? "Model updated to match the code" : "dismissed"}`);
      return text([`Approved Proposal ${n.name("proposal", approved)}`, ...lines].join("\n"), { id: approved, number: n.label("proposal", approved), status: "approved", resolved });
    }
    if (state === "rejected") {
      requireNotAttached(project, proposalId);
      const p = rejectProposal(project, proposalId, input.feedback);
      const n = numbersOf(ctx);
      return text(`Rejected Proposal ${n.name("proposal", p.id)}`, { id: p.id, number: n.label("proposal", p.id), status: p.data.status });
    }
    if (state !== "discarded") throw new TramaError(`Unknown state ${state}`);
    const p = discardProposal(project, proposalId);
    const n = numbersOf(ctx);
    return text(`Discarded Proposal ${n.name("proposal", p.id)}`, { id: p.id, number: n.label("proposal", p.id), status: p.data.status });
  },
});

export const PROPOSAL_COMMANDS = [create, show, list, edit, move];
