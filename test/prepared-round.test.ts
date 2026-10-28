import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { editDrift, type PreparedRoundOutcome, preparedQuestionDrift, preparedRoundOutcome, readyRound, type RoundQuestion } from "../src/core/prepared";
import { approveProposal, editInProposal, getProposal, listProposals, newProposal, save } from "../src/core/proposals";
import type { QuestionAnswer } from "../src/core/questions";
import { writePreparedRoundResolution } from "../src/core/resolution";
import { type Project, projectAt } from "../src/core/store";
import { type DifferenceInput, type Drift, getDrift, newDrift, newUnifiedDrift } from "../src/core/work";
import { FIX_OPTIONS } from "./fix-options";
import { copyShop } from "./shop-project";

let dir: string;
let p: Project;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-round-"));
  copyShop(dir);
  p = projectAt(dir);
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const drift = (title: string, proposal?: string) => newDrift(p, { where: "src/refund.ts", title, refs: ["order"], happens: "Code does it.", should: "Model says so.", options: FIX_OPTIONS, ...(proposal ? { proposal } : {}) });
const diff = (d: Drift, extra: Partial<DifferenceInput> = {}): DifferenceInput => ({ drift: d.id, title: d.title, refs: d.data.refs, happens: `${d.title} happens.`, should: `${d.title} should happen.`, where: "src/refund.ts", options: FIX_OPTIONS, ...extra });
const unify = (drifts: Drift[], differences: DifferenceInput[] = drifts.map((d) => diff(d))) => newUnifiedDrift(p, { title: "All of them", unifies: drifts.map((d) => d.id), differences }).drift;

const question = (id: string) => ({
  id,
  question: "What should change?",
  options: [{ label: "Fix it", description: "a" }, { label: "Remove it", description: "b" }, { label: "Keep", description: "c" }],
  recommended: 0,
  multi: false,
});
const decisions = [{ decision: "fix-code", option: 1 }, { decision: "fix-code", option: 2 }, { decision: "dismissed" }];
/** Prepares the questions of `differences` of `unified`, each with the three options above. */
const prepare = (unified: Drift, differences: Drift[], withDecisions: object[] = decisions) =>
  editDrift(p, unified.id, { prepared: { questions: differences.map((d) => ({ difference: d.id, question: question(d.id), decisions: withDecisions })) } });
const questionsOf = (unified: Drift): RoundQuestion[] => {
  const ready = readyRound(p, getDrift(p, unified.id));
  return ready.questions;
};
const answered = (selected: string, text?: string): QuestionAnswer => ({ status: "answered", selected: [selected], ...(text === undefined ? {} : { text }) });
const outcome = (unified: Drift, answers: Record<string, QuestionAnswer | undefined>): PreparedRoundOutcome => preparedRoundOutcome(getDrift(p, unified.id), questionsOf(unified), answers);

describe("readyRound", () => {
  test("is complete when every open difference has a valid question, and holds the valid ones otherwise", () => {
    const [a, b, c] = [drift("A"), drift("B"), drift("C")] as const;
    const unified = unify([a, b, c]);
    expect(readyRound(p, getDrift(p, unified.id))).toEqual({ questions: [], complete: false });
    prepare(unified, [a, c]);
    const partly = readyRound(p, getDrift(p, unified.id));
    expect(partly.questions.map((q) => q.difference)).toEqual([a.id, c.id]);
    expect(partly.complete).toBe(false);
    prepare(unified, [b]);
    const all = readyRound(p, getDrift(p, unified.id));
    expect(all.questions.map((q) => [q.difference, q.value.question.id])).toEqual([[a.id, a.id], [b.id, b.id], [c.id, c.id]]);
    expect(all.complete).toBe(true);
  });

  test("a stale question, or a Drift without differences, is not ready", () => {
    const [a, b] = [drift("A"), drift("B")] as const;
    const unified = unify([a, b]);
    prepare(unified, [a, b]);
    expect(readyRound(p, getDrift(p, unified.id)).complete).toBe(true);
    const file = join(dir, ".trama/model/checkout/order.md");
    writeFileSync(file, readFileSync(file, "utf8").replace("refunds the customer.", "refunds the customer fully."));
    expect(readyRound(p, getDrift(p, unified.id))).toEqual({ questions: [], complete: false });
    expect(readyRound(p, drift("Plain"))).toEqual({ questions: [], complete: false });
  });
});

describe("preparedRoundOutcome", () => {
  test("Fix options and plain dismissed answers are written, one decision for each answered difference", () => {
    const [a, b, c] = [drift("A"), drift("B"), drift("C")] as const;
    const unified = unify([a, b, c]);
    prepare(unified, [a, b, c]);
    const out = outcome(unified, { [a.id]: answered("Remove it", " soon "), [b.id]: answered("Keep"), [c.id]: { status: "skipped" } });
    expect(out).toEqual({
      kind: "write",
      answers: [{ difference: a.id, answer: { decision: "fix-code", option: 2, note: "soon" } }, { difference: b.id, answer: { decision: "dismissed" } }],
      given: { [a.id]: { selected: ["Remove it"], text: " soon " }, [b.id]: { selected: ["Keep"] } },
    });
  });

  test("nothing is written when every question is skipped or missing", () => {
    const [a, b] = [drift("A"), drift("B")] as const;
    const unified = unify([a, b]);
    prepare(unified, [a, b]);
    expect(outcome(unified, { [a.id]: { status: "skipped" }, [b.id]: { status: "skipped" } })).toEqual({ kind: "none" });
    expect(outcome(unified, {})).toEqual({ kind: "none" });
  });

  test("free text with a choice that is not a Fix option, or with no choice, needs the agent with every answer", () => {
    const [a, b] = [drift("A"), drift("B")] as const;
    const unified = unify([a, b]);
    prepare(unified, [a, b]);
    const out = outcome(unified, { [a.id]: answered("Keep", "but log it"), [b.id]: answered("Fix it") });
    expect(out).toEqual({ kind: "agent", answers: { [a.id]: { selected: ["Keep"], text: "but log it" }, [b.id]: { selected: ["Fix it"] } }, linked: false });
    expect(outcome(unified, { [a.id]: { status: "answered", selected: [], text: "something else" }, [b.id]: { status: "skipped" } })).toEqual({ kind: "agent", answers: { [a.id]: { selected: [], text: "something else" } }, linked: false });
  });

  test("linked differences decided differently go to the agent, a fix-code with any option being one decision, and a skipped one counts for nothing", () => {
    const [a, b, c] = [drift("A"), drift("B"), drift("C")] as const;
    const unified = unify([a, b, c], [diff(a, { linked: [b.id] }), diff(b), diff(c)]);
    prepare(unified, [a, b, c]);
    const different = outcome(unified, { [a.id]: answered("Fix it"), [b.id]: answered("Keep"), [c.id]: answered("Keep") });
    expect(different).toEqual({ kind: "agent", linked: true, answers: { [a.id]: { selected: ["Fix it"] }, [b.id]: { selected: ["Keep"] }, [c.id]: { selected: ["Keep"] } } });
    expect(outcome(unified, { [a.id]: answered("Fix it"), [b.id]: answered("Remove it") }).kind).toBe("write");
    expect(outcome(unified, { [a.id]: answered("Fix it"), [b.id]: { status: "skipped" }, [c.id]: answered("Keep") }).kind).toBe("write");
    // Decisions that differ between differences that are not linked are free.
    expect(outcome(unified, { [a.id]: answered("Keep"), [c.id]: answered("Fix it") }).kind).toBe("write");
  });
});

describe("writePreparedRoundResolution", () => {
  test("writes one entry for each answered difference, one body line each, and the unanswered ones stay open", () => {
    const [a, b, c] = [drift("A"), drift("B"), drift("C")] as const;
    const unified = unify([a, b, c]);
    const out = writePreparedRoundResolution(p, unified.id, [{ difference: a.id, answer: { decision: "fix-code", option: 2 } }, { difference: c.id, answer: { decision: "dismissed" } }]);
    expect(out.refusal).toBeNull();
    const r = getProposal(p, out.proposal?.id as string);
    expect(r.title).toBe("Resolve: All of them");
    expect(r.data).toMatchObject({ status: "open", kind: "resolution", prepared: true, drifts: [{ drift: unified.id, difference: a.id, decision: "fix-code", option: 2 }, { drift: unified.id, difference: c.id, decision: "dismissed" }] });
    expect(r.body.match(/^Resolves Drift .*$/gm)).toHaveLength(2);
    expect(r.body).toContain(`difference ${a.id} (A)`);
    expect(r.body).toContain("code fixed with option remove the code");
    approveProposal(p, r.id);
    const read = getDrift(p, unified.id);
    expect(read.data.status).toBe("open");
    expect(read.data.differences.map((d) => d.decision)).toEqual(["fix-code", null, "dismissed"]);
  });

  test("a proposal decision copies the files of the Proposal attached to its difference", () => {
    const attached = newProposal(p, "Attached");
    const path = editInProposal(p, attached.id, "checkout/order.md");
    writeFileSync(path, `${readFileSync(path, "utf8").trimEnd()}\n\nA prepared change.\n`);
    const [a, b] = [drift("A", attached.id), drift("B")] as const;
    const unified = unify([a, b]);
    expect(getDrift(p, unified.id).data.differences.map((d) => d.proposal)).toEqual([attached.id, null]);
    const out = writePreparedRoundResolution(p, unified.id, [{ difference: a.id, answer: { decision: "proposal" } }, { difference: b.id, answer: { decision: "dismissed" } }]);
    expect(out.refusal).toBeNull();
    const r = getProposal(p, out.proposal?.id as string);
    expect(readFileSync(join(r.dir, "model/checkout/order.md"), "utf8")).toBe(readFileSync(path, "utf8"));
    approveProposal(p, r.id);
    expect(readFileSync(join(dir, ".trama/model/checkout/order.md"), "utf8")).toContain("A prepared change.");
    expect(getDrift(p, unified.id).data).toMatchObject({ status: "resolved", resolution: "differences" });
    expect(getProposal(p, attached.id).data.status).toBe("discarded");
  });

  test("two attached Proposals that change the same file, or a difference without one, are refused: the Draft is discarded", () => {
    const first = newProposal(p, "First");
    const second = newProposal(p, "Second");
    for (const [proposal, text] of [[first, "One."], [second, "Two."]] as const) {
      const path = editInProposal(p, proposal.id, "checkout/order.md");
      writeFileSync(path, `${readFileSync(path, "utf8").trimEnd()}\n\n${text}\n`);
    }
    const [a, b, c] = [drift("A", first.id), drift("B", second.id), drift("C")] as const;
    const unified = unify([a, b, c]);
    const both = writePreparedRoundResolution(p, unified.id, [{ difference: a.id, answer: { decision: "proposal" } }, { difference: b.id, answer: { decision: "proposal" } }]);
    expect(both.proposal).toBeNull();
    expect(both.refusal).toMatch(/both change checkout\/order\.md/);
    const none = writePreparedRoundResolution(p, unified.id, [{ difference: c.id, answer: { decision: "proposal" } }]);
    expect(none.refusal).toMatch(/no attached Proposal/);
    expect(listProposals(p).filter((x) => x.data.kind === "resolution").map((x) => x.data.status)).toEqual(["discarded", "discarded"]);
    expect(getDrift(p, unified.id).data.differences.every((d) => d.decision === null)).toBe(true);
  });

  test("a refused entry, such as a difference already decided or held by another resolution, discards the Draft and returns the refusal", () => {
    const [a, b] = [drift("A"), drift("B")] as const;
    const unified = unify([a, b]);
    const holding = newProposal(p, "Holding", "", { kind: "resolution" });
    const held = getProposal(p, holding.id);
    held.data.drifts = [{ drift: unified.id, difference: a.id, decision: "dismissed" }];
    save(held);
    const out = writePreparedRoundResolution(p, unified.id, [{ difference: a.id, answer: { decision: "dismissed" } }, { difference: b.id, answer: { decision: "dismissed" } }]);
    expect(out.proposal).toBeNull();
    expect(out.refusal).toMatch(/already in resolution/);
    expect(listProposals(p).filter((x) => x.data.prepared).map((x) => x.data.status)).toEqual(["discarded"]);
  });
});

describe("preparedQuestionDrift", () => {
  test("a question of a round belongs to the open unified Drift that has its difference, any other to the Drift with its identity", () => {
    const [a, b] = [drift("A"), drift("B")] as const;
    const unified = unify([a, b]);
    const plain = drift("Plain");
    expect(preparedQuestionDrift(p, a.id).id).toBe(unified.id);
    expect(preparedQuestionDrift(p, b.id).id).toBe(unified.id);
    expect(preparedQuestionDrift(p, plain.id).id).toBe(plain.id);
    expect(preparedQuestionDrift(p, unified.id).id).toBe(unified.id);
  });
});
