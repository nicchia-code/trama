import { expect, test } from "bun:test";
import { ASK_DEVELOPER_SENTENCE, askMorePart, AUTO_EXIT_SENTENCE, buildPrompt, importPrompt, instructedMessage, languageSentence, mayFileDrifts, PARTLY_PREPARED_SENTENCE, PREPARED_ROUND_ANSWER_SENTENCE, preparedRoundPrompt, type ResolvedAction, terminalName, withLanguage } from "../extension/src/host/prompts";

test("each action names its skill and its scope exactly", () => {
  expect(buildPrompt({ kind: "written-design", request: "2026-10-04T19-05-12" })).toBe(
    "Use the trama-design skill on the design request in `.trama/requests/2026-10-04T19-05-12.md`. Bind the first Proposal you open to it with the `request` field.",
  );
  expect(buildPrompt({ kind: "setup-request", request: "2026-10-04T19-05-12" })).toBe(
    "Use the trama-setup skill on the project request in `.trama/requests/2026-10-04T19-05-12.md`. Bind the setup Proposal you open to it with the `request` field.",
  );
  expect(buildPrompt({ kind: "scan" })).toBe("Use the trama-scan skill on the whole System.");
  expect(buildPrompt({ kind: "mergeScan", base: "aaaa1111", incoming: "bbbb2222" })).toBe(
    "Use the trama-scan skill on the whole System. A merge brought in `aaaa1111...bbbb2222`: mark `merge` on every Drift whose Where in the code lies in a file `git diff --name-only aaaa1111...bbbb2222` lists.",
  );
  expect(buildPrompt({ kind: "reconcileMerge", branch: "origin/main" })).toBe("Use the trama-merge skill to resolve the conflicts of the merge of `origin/main` in progress.");
  expect(buildPrompt({ kind: "implement", task: "0012" })).toBe("Use the trama-implement skill on Task 0012.");
  expect(buildPrompt({ kind: "implement-all" })).toBe(
    'Use the trama-implement skill on every Task in the "todo" column. Take them from `trama task list --input \'{"runnable":true,"max":{maxParallelAgents}}\'`, one group at a time, until it says there is none.',
  );
  expect(buildPrompt({ kind: "resolve-drifts", drift: "ab12cd34" })).toBe(
    "Use the trama-resolve-drifts skill on the open Drift ab12cd34, and on no other open Drift: ask the developer what should happen for it, then write one resolution Proposal.",
  );
});

test("no instruction mentions the delegation: Resolve Drifts is manual and nothing is automatic", () => {
  const all = [buildPrompt({ kind: "resolve-drifts", drift: "ab12cd34" }), buildPrompt({ kind: "implement-all" }), buildPrompt({ kind: "implement", task: "t" })].join(" ");
  expect(all).not.toContain("automatic");
  expect(all).not.toContain("autopilot");
  expect(all).not.toContain("TRAMA_JOB");
});

test("the import instruction names the excluded paths, or says every folder is imported, only when the wizard decided", () => {
  const base = "Use the trama-import skill on this repository.";
  expect(buildPrompt({ kind: "import" })).toBe(base);
  expect(importPrompt()).toBe(base);
  expect(buildPrompt({ kind: "import", excluded: [] })).toBe(`${base} Import every folder and do not ask which folders to import.`);
  expect(buildPrompt({ kind: "import", excluded: ["a", "b/c"] })).toBe(`${base} Do not import these paths and do not ask which folders to import: \`a\`, \`b/c\`.`);
});

test("the agent terminal is named after the work: the card's short number, or a fixed word", () => {
  const short = (kind: "task" | "proposal", id: string) => (kind === "task" ? `T${id.length}` : `P${id.length}`);
  expect(terminalName({ kind: "implement", task: "abc" }, short)).toBe("T3");
  expect(terminalName({ kind: "written-design", request: "r" }, short)).toBe("Design");
  expect(terminalName({ kind: "setup-request", request: "r" }, short)).toBe("Setup");
  expect(terminalName({ kind: "resolve-drifts", drift: "ab12cd34" }, short)).toBe("Drifts");
  expect(terminalName({ kind: "scan" }, short)).toBe("Scan");
  expect(terminalName({ kind: "mergeScan", base: "a", incoming: "b" }, short)).toBe("Scan");
  expect(terminalName({ kind: "reconcileMerge", branch: "main" }, short)).toBe("Merge");
  expect(terminalName({ kind: "implement-all" }, short)).toBe("All tasks");
  expect(terminalName({ kind: "import" }, short)).toBe("Import");
});

test("the handoff request and the publication of issues are one-line instructions of the trama-handoff skill, with their terminals and no Drifts", () => {
  const short = (kind: "task" | "proposal", id: string) => (kind === "task" ? `T${id.length}` : `P${id.length}`);
  expect(buildPrompt({ kind: "handoff-request", request: "r1" })).toBe("Use the trama-handoff skill on the handoff request in `.trama/requests/r1.md`. Bind the first handoff you open to it with the `request` field.");
  expect(buildPrompt({ kind: "publish-issues", handoff: "ab12cd34" })).toBe("Use the trama-handoff skill to publish the issues of handoff ab12cd34.");
  expect(terminalName({ kind: "handoff-request", request: "r1" }, short)).toBe("Handoff");
  expect(terminalName({ kind: "publish-issues", handoff: "ab12cd34" }, short)).toBe("Publish P8");
  expect(mayFileDrifts({ kind: "handoff-request", request: "r1" })).toBe(false);
  expect(mayFileDrifts({ kind: "publish-issues", handoff: "ab12cd34" })).toBe(false);
});

test("Comment update and the Scan of a closed issue are one-line instructions with their terminals named after the issue's number: the first files no Drift, the second may", () => {
  const short = (kind: "task" | "proposal", id: string) => (kind === "task" ? `T${id.length}` : `P${id.length}`);
  const update: ResolvedAction = { kind: "update-issue", issue: "ab12cd34", number: 126 };
  const scan: ResolvedAction = { kind: "scan-issue", issue: "ab12cd34", number: 126, refs: ["order/Paid", "requirements/ui#panel"] };
  expect(buildPrompt(update)).toBe("Use the trama-handoff skill to comment on issue ab12cd34 what changed in the Model since it was published.");
  expect(buildPrompt(scan)).toBe(
    "Use the trama-scan skill on the references of issue ab12cd34: `order/Paid`, `requirements/ui#panel`. The work was done by a person of the team from this issue, so a difference leans towards fixing the code.",
  );
  expect(terminalName(update, short)).toBe("Update #126");
  expect(terminalName(scan, short)).toBe("Scan #126");
  expect(mayFileDrifts(update)).toBe(false);
  expect(mayFileDrifts(scan)).toBe(true);
});

test("Replan is a one-line instruction that names every open handoff, in the terminal Replan, and files no Drift", () => {
  const short = (kind: "task" | "proposal", id: string) => (kind === "task" ? `T${id.length}` : `P${id.length}`);
  const replan: ResolvedAction = { kind: "replan-handoffs", handoffs: ["ab12cd34", "ef56gh78"] };
  expect(buildPrompt(replan)).toBe("Use the trama-handoff skill to replan together the issues of the open handoffs ab12cd34, ef56gh78.");
  expect(buildPrompt({ kind: "replan-handoffs", handoffs: ["ab12cd34"] })).toBe("Use the trama-handoff skill to replan together the issues of the open handoffs ab12cd34.");
  expect(terminalName(replan, short)).toBe("Replan");
  expect(mayFileDrifts(replan)).toBe(false);
});

test("a chosen language ends every job's instruction on the same line, trimmed and as typed; blank asks nothing", () => {
  const sentence = (language: string) => `Write the texts for the developer in ${language}, as the Language section of your instructions says.`;
  const jobs = [
    buildPrompt({ kind: "written-design", request: "r" }),
    buildPrompt({ kind: "setup-request", request: "r" }),
    buildPrompt({ kind: "scan" }),
    buildPrompt({ kind: "import" }),
    buildPrompt({ kind: "implement", task: "abc" }),
    buildPrompt({ kind: "implement-all" }),
    buildPrompt({ kind: "resolve-drifts", drift: "ab12cd34" }),
    buildPrompt({ kind: "unify-drifts", drifts: ["aaaa1111", "bbbb2222"] }),
    buildPrompt({ kind: "rework", proposal: "ab12cd34", skill: "design" }),
    buildPrompt({ kind: "rework-resolution", proposal: "ab12cd34", drifts: ["aaaa1111"] }),
    buildPrompt({ kind: "refine", proposal: "ab12cd34", seats: 1, job: "j" }),
  ];
  for (const job of jobs) {
    expect(withLanguage(job, "  Italian ")).toBe(`${job} ${sentence("Italian")}`);
    expect(withLanguage(job, "Deutsch")).toBe(`${job} ${sentence("Deutsch")}`);
    expect(withLanguage(job, "")).toBe(job);
    expect(withLanguage(job, " \t ")).toBe(job);
  }
  expect(withLanguage("Use the trama-scan skill on the whole System.", "  Italian ")).toBe(
    "Use the trama-scan skill on the whole System. Write the texts for the developer in Italian, as the Language section of your instructions says.",
  );
});
test("Ask more carries only the language sentence after its part, when a language is chosen", () => {
  const part = askMorePart({ kind: "task", id: "j6tlxyad", number: "T1", title: "Lancio", body: "Launch.", refs: [], images: [], proposal: null, drift: null });
  expect(withLanguage(part, " Italian ")).toBe(`${part} ${languageSentence("Italian")}`);
  expect(languageSentence("Italian")).toBe("Write the texts for the developer in Italian, as the Language section of your instructions says.");
  expect(withLanguage(part, "  ")).toBe(part);
});
test("implementation batch commands receive the configured limit at send time", () => {
  const all = buildPrompt({ kind: "implement-all" }).replaceAll("{maxParallelAgents}", "7");
  expect(all).toContain('trama task list --input \'{"runnable":true,"max":7}\'');
});
test("a Run all group cut by Proposal names its Proposals and the filter, and its terminal names its model", () => {
  const short = (kind: "task" | "proposal", id: string) => (kind === "task" ? `T${id.length}` : `P${id.length}`);
  expect(buildPrompt({ kind: "implement-all", group: { include: ["aaaa1111", "bbbb2222"] } })).toBe(
    'Use the trama-implement skill on every Task in the "todo" column that belongs to the Proposals `aaaa1111`, `bbbb2222`. Take them from `trama task list --input \'{"runnable":true,"proposals":["aaaa1111","bbbb2222"],"max":{maxParallelAgents}}\'`, one group at a time, until it says there is none.',
  );
  expect(buildPrompt({ kind: "implement-all", group: { exclude: ["aaaa1111"] } })).toBe(
    'Use the trama-implement skill on every Task in the "todo" column except those of the Proposal `aaaa1111`. Take them from `trama task list --input \'{"runnable":true,"notProposals":["aaaa1111"],"max":{maxParallelAgents}}\'`, one group at a time, until it says there is none.',
  );
  expect(buildPrompt({ kind: "implement-all", group: { include: [], exclude: [] } })).toBe(buildPrompt({ kind: "implement-all" }));
  expect(terminalName({ kind: "implement-all", group: { include: ["aaaa1111"], model: "  gpt-5  " } }, short)).toBe("All tasks · gpt-5");
  expect(terminalName({ kind: "implement-all", group: { exclude: ["aaaa1111"] } }, short)).toBe("All tasks");
  expect(terminalName({ kind: "implement-all", group: { model: "  " } }, short)).toBe("All tasks");
});
test("only the instructions that may file Drifts are told so", () => {
  expect(mayFileDrifts({ kind: "scan" })).toBe(true);
  expect(mayFileDrifts({ kind: "mergeScan", base: "a", incoming: "b" })).toBe(true);
  expect(mayFileDrifts({ kind: "reconcileMerge", branch: "main" })).toBe(false);
  expect(mayFileDrifts({ kind: "implement", task: "abc" })).toBe(true);
  expect(mayFileDrifts({ kind: "implement-all" })).toBe(true);
  expect(mayFileDrifts({ kind: "import" })).toBe(true);
  expect(mayFileDrifts({ kind: "written-design", request: "r" })).toBe(false);
  expect(mayFileDrifts({ kind: "setup-request", request: "r" })).toBe(false);
  expect(mayFileDrifts({ kind: "resolve-drifts", drift: "ab12cd34" })).toBe(false);
});

test("every instruction carries the one ask sentence, whatever the job", () => {
  expect(ASK_DEVELOPER_SENTENCE).toBe("Ask the developer only with `trama question new`, as the skill says, never with your own question tool; run it with no time limit and wait until it ends.");
});

test("every instruction with autoExit on closes the session after one short line, with no summary", () => {
  expect(AUTO_EXIT_SENTENCE).toBe("Trama closes this session as soon as you finish: end with one short line at most, with no summary or report.");
});

test("the Rework instruction is the Resolve one, with the trimmed feedback after it on the same line", async () => {
  const { reworkPrompt } = await import("../extension/src/host/prompts");
  const resolve = buildPrompt({ kind: "resolve-drifts", drift: "ab12cd34" });
  expect(reworkPrompt("ab12cd34", "   ")).toBe(resolve);
  expect(reworkPrompt("ab12cd34", "  keep the code  ")).toBe(`${resolve} The developer's feedback on how to resolve it: "keep the code"`);
});

test("the Rework instruction of a rejected Proposal follows its kind, binds it with reworks and names its terminal", () => {
  const name = (kind: "task" | "proposal", id: string) => id;
  const design = { kind: "rework", proposal: "ab12cd34", skill: "design" } as const;
  expect(buildPrompt(design)).toBe("Use the trama-design skill to rework the rejected Proposal ab12cd34 with the developer's feedback. Bind the first Proposal you open to it with the `reworks` field.");
  expect(terminalName(design, name)).toBe("Design");
  const setup = { kind: "rework", proposal: "ab12cd34", skill: "setup" } as const;
  expect(buildPrompt(setup)).toBe("Use the trama-setup skill to rework the rejected setup Proposal ab12cd34 with the developer's feedback. Bind the setup Proposal you open to it with the `reworks` field.");
  expect(terminalName(setup, name)).toBe("Setup");
  const imported = { kind: "rework", proposal: "ab12cd34", skill: "import" } as const;
  expect(buildPrompt(imported)).toBe("Use the trama-import skill to rework the rejected Proposal ab12cd34 with the developer's feedback. Bind the first Proposal you open to it with the `reworks` field.");
  expect(terminalName(imported, name)).toBe("Import");
  expect(mayFileDrifts(imported)).toBe(true);
  expect(mayFileDrifts(design)).toBe(false);
  const resolution = { kind: "rework-resolution", proposal: "ab12cd34", drifts: ["aaaaaaaa", "bbbbbbbb"] } as const;
  expect(buildPrompt({ ...resolution, drifts: [...resolution.drifts] })).toBe("Use the trama-resolve-drifts skill to rework the rejected resolution ab12cd34 with the developer's feedback, on the Drifts `aaaaaaaa`, `bbbbbbbb`. Bind the resolution you open to it with the `reworks` field.");
  expect(terminalName({ ...resolution, drifts: [...resolution.drifts] }, name)).toBe("Drifts");
});

test("the Ask more part of a Task names only permanent identities in its commands, with its text, references, images and linked cards", () => {
  const part = askMorePart({
    kind: "task",
    id: "j6tlxyad",
    number: "T1",
    title: "Lancio di Ask more",
    body: "Launch the chat.",
    refs: ["developer.ASK_MORE", "agent-launching"],
    images: ["/p/.trama/task-images/j6tlxyad/a.png"],
    proposal: { id: "x6bguwt0", title: "Ask more" },
    drift: null,
  });
  expect(part).toContain('Ask more about the Task j6tlxyad: "Lancio di Ask more". Its short number in this working copy is T1, for the developer only');
  expect(part).toContain("Launch the chat.");
  expect(part).toContain("References: `developer.ASK_MORE`, `agent-launching`");
  expect(part).toContain("Images: `/p/.trama/task-images/j6tlxyad/a.png`");
  expect(part).toContain("Proposal it belongs to: `x6bguwt0` — Ask more");
  expect(part).toContain("Drift it comes from: none");
  expect(part).toContain("`trama task show j6tlxyad`, `trama proposal show x6bguwt0`, `trama model show developer.ASK_MORE`, `trama model show agent-launching`");
  expect(part).not.toMatch(/trama (task|proposal|drift|model) show T1/);
});

test("the Ask more part of a Drift lists its sides, its origin and the Drifts it unites, and no freed Tasks", () => {
  const part = askMorePart({
    kind: "drift",
    id: "d1d1d1d1",
    number: "D2",
    title: "Refund gap",
    status: "open",
    happens: "The refund ignores the coupon.",
    should: "The refund follows the coupon.",
    where: "src/refund.ts",
    refs: ["order"],
    proposal: null,
    task: { id: "t1t1t1t1", title: "Fix refund" },
    previous: [],
    unifies: [{ id: "d3d3d3d3", title: "Coupon" }],
  });
  expect(part).toContain("What happens: The refund ignores the coupon.");
  expect(part).toContain("What should happen: The refund follows the coupon.");
  expect(part).toContain("Where in the code: src/refund.ts");
  expect(part).not.toContain("leaves free");
  expect(part).toContain("Task it comes from: `t1t1t1t1` — Fix refund");
  expect(part).toContain("Drifts it unites: `d3d3d3d3` — Coupon");
  expect(part).toContain("`trama drift show d1d1d1d1`");
  expect(part).not.toContain("trama task show t2t2t2t2");
  expect(part).toContain("`trama drift show d3d3d3d3`");
});

test("the Ask more part of a resolution Proposal lists the decision on each Drift it resolves", () => {
  const part = askMorePart({
    kind: "proposal",
    id: "p1p1p1p1",
    number: "P1",
    title: "Resolve Drifts",
    status: "open",
    proposalKind: "resolution",
    body: "Resolves two Drifts.",
    tasks: [],
    drifts: [{ id: "d1d1d1d1", title: "Refund gap", decision: "fix-code", option: 1 }, { id: "d2d2d2d2", title: "Menu", decision: null, option: null }],
  });
  expect(part).toContain("Status: open. Kind: resolution.");
  expect(part).toContain("`d1d1d1d1` — Refund gap: fix-code (option 1)");
  expect(part).toContain("`d2d2d2d2` — Menu: undecided");
  expect(part).toContain("Its Tasks:\nnone");
});

test("the Ask more part of a question holds the question in view in full and the round in order, with no answer or choice", () => {
  const first = { id: "q1", question: "Which way?", context: "Two ways exist.", options: [{ label: "A", description: "the first", details: "more on A" }, { label: "B", description: "the second" }], recommended: 0, multi: false };
  const second = { id: "q2", question: "Which places?", options: [{ label: "C", description: "the third" }], recommended: 0, multi: true };
  const part = askMorePart({ kind: "question", question: first, round: [first, second], drift: { id: "d9d9d9d9", title: "Prepared" } });
  expect(part).toContain("Question: Which way?");
  expect(part).toContain("Context: Two ways exist.");
  expect(part).toContain("Choice: one option");
  expect(part).toContain("1. A (recommended): the first Details: more on A");
  expect(part).toContain("2. B: the second");
  expect(part).toContain("- (in view) Which way? [A: the first]");
  expect(part).toContain("- Which places? [C: the third]");
  expect(part).toContain("`trama drift show d9d9d9d9`");
  expect(part).toContain("the developer answers it in Trama");
  expect(part).not.toMatch(/selected|skipped|Your answer/i);
});

test("instructedMessage sets the instruction apart from the developer's message, which stays as written", () => {
  expect(instructedMessage("Do the thing.", "Why?\n  two lines")).toBe("Instructions from Trama (not written by the developer):\nDo the thing.\n\nDeveloper's message:\nWhy?\n  two lines");
});

test("the instruction that hands the agent the answers of a unified Drift's round carries them by difference on one line, and the linked-decisions sentence only when asked", () => {
  const base = buildPrompt({ kind: "resolve-drifts", drift: "ab12cd34" });
  const answers = { aaaa1111: { selected: ["Keep"], text: "but log it\nalways" }, bbbb2222: { selected: ["Fix it"] } };
  const plain = preparedRoundPrompt("ab12cd34", answers, false);
  expect(plain).toBe(`${base} ${PREPARED_ROUND_ANSWER_SENTENCE} ${JSON.stringify(answers)}.`);
  expect(plain).toContain("The developer already answered this unified Drift's prepared round. Answers: {");
  expect(plain).not.toContain("\n");
  expect(preparedRoundPrompt("ab12cd34", answers, true)).toBe(`${plain} Linked differences got different decisions: reconcile them, asking again only their questions if needed.`);
  expect(PARTLY_PREPARED_SENTENCE).toBe("Some differences of this unified Drift have a valid prepared question: keep them, prepare the others and ask one round about every open difference.");
});

test("the Ask more part of a question of a unified Drift's prepared round names the unified Drift, the question in view in full and the other questions of the round without answers", () => {
  const first = { id: "aaaa1111", question: "What about A?", options: [{ label: "Fix A", description: "fix it" }, { label: "Keep A", description: "keep it" }], recommended: 0, multi: false };
  const second = { id: "bbbb2222", question: "What about B?", options: [{ label: "Fix B", description: "fix it" }], recommended: 0, multi: false };
  const part = askMorePart({ kind: "question", question: second, round: [first, second], drift: { id: "cccc3333", title: "Together" } });
  expect(part).toContain("Question: What about B?");
  expect(part).toContain("- What about A? [Fix A: fix it] [Keep A: keep it]");
  expect(part).toContain("- (in view) What about B?");
  expect(part).toContain('This is the prepared question of the Drift cccc3333 ("Together"). Read it with `trama drift show cccc3333`.');
  expect(part).not.toContain("bbbb2222");
});
