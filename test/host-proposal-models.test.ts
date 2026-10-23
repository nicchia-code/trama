import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { approveProposal, discardProposal, editInProposal, getProposal, newProposal, rejectProposal } from "../src/core/proposals";
import { type Project, projectAt } from "../src/core/store";
import { listTasks, moveTask } from "../src/core/work";
import { appliedProposalModels, boardModels, chooseProposalModel, forgetProposalModels, PROPOSAL_MODELS_KEY, proposalModels, proposalRunModel, type ModelMemory, type ProposalModels } from "../extension/src/host/proposal-models";
import { coverWithTask } from "./cover";
import { cardName } from "../src/core/short-numbers";
import { handOver } from "./handover";

/** A workspace state in memory: what `vscode.Memento` keeps across the calls of one session. */
function memory(initial: unknown = undefined): ModelMemory & { value: unknown } {
  const store = { value: initial };
  return {
    get: (key: string) => (key === PROPOSAL_MODELS_KEY ? store.value : undefined),
    update: async (key: string, value: unknown) => {
      if (key === PROPOSAL_MODELS_KEY) store.value = value;
    },
    get value() {
      return store.value;
    },
  };
}

let dir: string;
let p: Project;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "trama-models-"));
  cpSync(join(import.meta.dir, "../examples/shop"), dir, { recursive: true });
  p = projectAt(dir);
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

const orderChange = (t: string) => t.replace("### Cancelled (final)", "### Cancelled (final)\n\n### Lost (final)");

/** An ordinary Proposal carrying one Task, handed over and open. */
function openWithTask(): string {
  const prop = newProposal(p, "Change");
  const file = editInProposal(p, prop.id, "checkout/order.md");
  writeFileSync(file, orderChange(readFileSync(file, "utf8")));
  coverWithTask(p, prop.id, "checkout", "user");
  handOver(p, prop.id);
  return prop.id;
}

describe("choosing the model of a Proposal", () => {
  test("stores the trimmed model alone, and changes no file", () => {
    const id = openWithTask();
    const before = readFileSync(join(getProposal(p, id).dir, "proposal.md"), "utf8");
    const store = memory();
    return chooseProposalModel(store, p, id, "  gpt-5  ").then(() => {
      expect(proposalModels(store)).toEqual({ [id]: { model: "gpt-5" } });
      expect(readFileSync(join(getProposal(p, id).dir, "proposal.md"), "utf8")).toBe(before);
      expect(getProposal(p, id).data.status).toBe("open");
    });
  });

  test("an empty text forgets the model", async () => {
    const id = openWithTask();
    const store = memory({ [id]: { model: "gpt-5" } });
    await chooseProposalModel(store, p, id, "   ");
    expect(proposalModels(store)).toEqual({});
  });

  test("refuses a Draft and an open Proposal with no Tasks, changing nothing", async () => {
    const store = memory();
    const draft = newProposal(p, "Draft");
    await expect(chooseProposalModel(store, p, draft.id, "gpt-5")).rejects.toThrow("is draft");
    const bare = newProposal(p, "Bare");
    const file = editInProposal(p, bare.id, "checkout/order.md");
    writeFileSync(file, orderChange(readFileSync(file, "utf8")));
    handOver(p, bare.id);
    await expect(chooseProposalModel(store, p, bare.id, "gpt-5")).rejects.toThrow("carries no Tasks");
    expect(store.value).toBeUndefined();
  });
});

describe("reading the stored models", () => {
  test("entries of another shape are ignored and dropped by the next write", async () => {
    const id = openWithTask();
    const good = { model: "gpt-5" };
    const store = memory({
      [id]: good,
      other: { model: "x", extra: true },
      bad: { model: " spaced " },
      empty: { model: "" },
    });
    expect(proposalModels(store)).toEqual({ [id]: good });
    await chooseProposalModel(store, p, id, "gpt-4");
    expect(store.value).toEqual({ [id]: { model: "gpt-4" } });
  });

  test.each(["omp", "cursor", "chat", "claude"])("an entry with agent %s is ignored and dropped by the next write", async (agent) => {
    const id = openWithTask();
    const other = openWithTask();
    const store = memory({ [id]: { model: "gpt-5", agent }, [other]: { model: "b", agent } });
    expect(proposalModels(store)).toEqual({});
    await chooseProposalModel(store, p, other, "gpt-4");
    expect(store.value).toEqual({ [other]: { model: "gpt-4" } });
  });

  test("a value that is not an object reads as no models", () => {
    expect(proposalModels(memory("nonsense"))).toEqual({});
    expect(proposalModels(memory(["list"]))).toEqual({});
  });
});

describe("the models the Board shows", () => {
  test("gives every Proposal that carries Tasks its chosen model name, and none otherwise", () => {
    const withModel = openWithTask();
    const withoutModel = openWithTask();
    const bare = newProposal(p, "Bare");
    const store = memory({ [withModel]: { model: "gpt-5" }, [bare.id]: { model: "x" } });
    const proposals = [{ id: withModel, tasks: [{}] }, { id: withoutModel, tasks: [{}] }, { id: bare.id, tasks: [] }];
    expect(boardModels(store, proposals)).toEqual({
      proposals: { [withModel]: { name: "gpt-5" }, [withoutModel]: null },
    });
  });
});

describe("forgetting the models", () => {
  test("keeps the model of a Draft and of an open Proposal", async () => {
    const draft = newProposal(p, "Draft");
    const open = openWithTask();
    const models: ProposalModels = {
      [draft.id]: { model: "a" },
      [open]: { model: "b" },
    };
    const store = memory(models);
    await forgetProposalModels(store, p);
    expect(proposalModels(store)).toEqual(models);
  });

  test("forgets a rejected or discarded Proposal, and one that no longer exists", async () => {
    const rejected = openWithTask();
    rejectProposal(p, rejected, "no");
    const discarded = newProposal(p, "Discarded");
    discardProposal(p, discarded.id);
    const store = memory({
      [rejected]: { model: "a" },
      [discarded.id]: { model: "b" },
      gone00000: { model: "c" },
    });
    await forgetProposalModels(store, p);
    expect(store.value).toEqual({});
  });

  test("keeps an approved Proposal while one of its Tasks is To do or In progress, and forgets it once all are Done", async () => {
    const id = openWithTask();
    approveProposal(p, id);
    const tasks = listTasks(p).filter((task) => task.data.proposal === id);
    expect(tasks.length).toBeGreaterThan(0);
    const store = memory({ [id]: { model: "a" } });
    await forgetProposalModels(store, p);
    expect(proposalModels(store)).toEqual({ [id]: { model: "a" } });

    for (const task of tasks) {
      moveTask(p, task.id, "doing", "developer");
      moveTask(p, task.id, "done", "developer");
    }
    await forgetProposalModels(store, p);
    expect(proposalModels(store)).toEqual({});
  });

  test("writes nothing when it forgets nothing", async () => {
    const id = openWithTask();
    let writes = 0;
    const store = memory({ [id]: { model: "a" } });
    const counted: ModelMemory = {
      get: store.get,
      update: (key, value) => {
        writes++;
        return store.update(key, value);
      },
    };
    await forgetProposalModels(counted, p);
    expect(writes).toBe(0);
  });
});

describe("the model a run takes from its Proposal", () => {
  test("is the model chosen for the Proposal, and none for another or for no Proposal", () => {
    const id = openWithTask();
    const store = memory({ [id]: { model: "gpt-5" } });
    expect(proposalRunModel(store, p, id)).toEqual({ model: "gpt-5" });
    expect(proposalRunModel(store, p, null)).toBeUndefined();
    expect(proposalRunModel(store, p, "gone00000")).toBeUndefined();
  });

  test("names an approved Proposal, which has no short number, by its title", () => {
    const id = openWithTask();
    approveProposal(p, id);
    const store = memory({ [id]: { model: "gpt-5" } });
    expect(proposalRunModel(store, p, id)).toEqual({ model: "gpt-5" });
  });

  test("an entry written with an agent gives no model", () => {
    const id = openWithTask();
    const store = memory({ [id]: { model: "gpt-5", agent: "omp" } });
    expect(proposalRunModel(store, p, id)).toBeUndefined();
  });
});

test("the applied models are the Proposals that have a model chosen", () => {
  const id = openWithTask();
  const store = memory({ [id]: { model: "gpt-5" } });
  expect(appliedProposalModels(store, p)).toEqual([{ id, run: { model: "gpt-5" } }]);
});
