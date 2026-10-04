---
name: trama-import
description: Use when asked to import, reverse-engineer or describe existing code as a Trama Model, in a project with a `.trama/` folder whose Model is empty or covers only part of the code. Reads the code and writes Proposals for the Model and its evident Requirements, describing the code as it is. Does not change code.
---

# Trama: import

You describe the **existing code** as a Trama **Model** (what the System does) plus its evident **Requirements** (how it is built), written as **Proposals** the developer approves. The Model you write describes the code **as it is**, bugs included; everything that looks wrong or that the documentation contradicts goes into the Proposal as a **doubt** for the developer, never silently "fixed".

## Hand-over

A new Proposal starts as a **Draft**, not approvable. Finish every file, validate and read the changes before `trama proposal submit <id>`. If submission is refused, fix the reported problems, validate and review again, then retry. Only after it succeeds tell the developer to review it. Before every later file change, call `trama proposal edit` again: it returns an open Proposal to Draft, so submit again when finished.

## Announcing cards

Once you have planned the Model (step 4), announce every Proposal you will write, each as soon as you know its title: `trama announce proposal "<title>"` prints an announcement ID. Pass it when you open that Proposal: `trama proposal new … --import --announcement <id>`. The Board shows a ghost of each Proposal meanwhile. Never wait for a ghost to show and never skip or delay a Proposal because of it; an unknown ID is only noted in the output.

## Hard rules

- NEVER edit code, `.trama/model/` or `.trama/requirements/` directly. Everything goes through Proposals opened with `--import`.
- NEVER run `trama proposal approve`, `trama proposal reject`, `trama proposal discard` or `trama drift resolve`.
- **The code wins.** Model what the code does. Where the documentation (README, `docs/`, comments, API descriptions) says something else, model the code and record the difference as a doubt. Where the code looks buggy or misses a case, model it as it is and record a doubt.
- **Never change what is already modelled.** If the Model already has Machines, do not edit their files. You may add new Features, Machines, Actors, Events of existing Actors and Requirement sections. If the code contradicts an existing Machine, do not fix it: list it in your report and suggest a Scan of that Feature.
- The Model has no code words: no variable, field, function, class, table, endpoint or file names in States, Transitions or Events. Write conditions and consequences in domain words. Code locations belong only in the doubts.
- Import only **evident and stable** Requirements: `tech` (language, framework, main libraries, platform, as declared in manifests and configuration), `data` (main entities and their fields, from schemas or models), `rules` (formulas, limits and policies written explicitly in the code). Never `ui` or `quality`: the code does not tell what was intended there.

## Steps

1. **Read what is modelled.** `trama system`, `trama requirements`, and `trama feature <id>` for each existing Feature. Note what is already covered.
2. **Survey the code yourself.** Manifests and configuration, entry points, routes and handlers, status fields and enums, workflows, jobs and timers, webhooks and integrations, screens and navigation, schemas, tests (they often state the intended behaviour), and the documentation.
3. **Ask one round of questions, then work alone.** In one call of your question tool (see "Asking" below) ask what you cannot find out yourself: which folders to import and which to ignore, and how to split the System into Features (offer your own split as the recommended option, plus one or two alternatives). Add any other question whose answer changes the whole import. After the answers, do not ask again: record the remaining uncertainty as doubts.
4. **Plan the Model.** One Machine per kind of thing with a lifecycle (an order, a payment, a subscription, a document), its States taken from the code's status values and the situations its handlers distinguish, its Transitions from the code paths that move between them, and the guards and side effects as prose. Who triggers what from outside (people, other systems, webhooks, time) are Actors that emit Events. Screens and navigation become a UI Machine only when the app has real navigation flows. Follow the format in [FORMAT.md](../trama-design/FORMAT.md).
5. **First Proposal: the System and its Actors.** `trama proposal new "Import: System and Actors" --import --body "<what was imported and from where>"`. Write `system.md` (only if it still has placeholder text or does not exist), every new Actor with the Events it emits, and the General sections of `tech` and `data`. On a partly modelled project, skip this Proposal if nothing is new.
6. **One Proposal per Feature.** `trama proposal new "Import: <Feature>" --import --requires <first Proposal ID> [--requires <ID of another Feature's Proposal whose Events this one reacts to>]`. Write `<feature>/feature.md`, its Machines, and the `data` and `rules` sections attached to them (`## order`, `## order/Paid`). Each Proposal is written and validated on top of the ones it requires, so only list Proposals you actually build on.
7. **Write the doubts.** End the body of each Proposal (`--body`, or edit `proposal.md`) with a `## Doubts` section, one line each:
   - documentation versus code: what the documentation says, where, and what the code does instead (file and line);
   - code that looks like a bug, a missing case or dead code, with its location;
   - behaviour you could not determine.
   Write "None." if there are none.
8. **Validate every Proposal.** `trama validate --proposal <id>` must report no errors. Then `trama proposal show <id>`: the changes must describe the code and nothing else.
9. **Hand every Proposal over.** After validation and review, run `trama proposal submit <id>` for each. A dependency need not be approved for submission. Correct any refusal, validate and review again, then retry before continuing.
10. **Report and stop.** After every submission succeeds, list the Proposals in the order to approve them, with how many doubts each has, the folders you skipped, and any contradiction with Machines that were already modelled (suggest a Scan for those Features). Approving an import Proposal starts no Scan: the Model already matches the code.

## Asking

Run **`trama ask --root <project>`** with the JSON request on stdin, for every round of questions.

- Send one complete round as `{questions: [...]}`. Every question has a unique non-empty `id`, `question`, `options` as `{label, description}`, a zero-based `recommended` index, and an explicit `multi` boolean. Set `multi: true` only when several answers can hold together. Do not supply "Other": Trama adds it.
- A result with `status: "answered"` contains `answers` keyed by question id. An answered entry has the original `selected` labels and optional free-form `text`; a `status: "skipped"` entry is an explicit developer skip. Use the recommendation for that skipped decision, report it as an assumption for review, and do not ask it again.
- An `invalid-input` error means the request was refused before opening a round: correct the identified field and submit the corrected request.
- An **`editor-interrupted` error stops this workflow immediately**. Do not use partial answers or recommendations, fall back, retry, reroute, resume the round, or create or submit a Proposal from its unanswered decisions. Report that the editor was lost.
- Only an initial `status: "unavailable"` result permits the agent-specific fallback below. Prefer its question tool; use text only if that tool is absent.

- **omp:** the `ask` tool. One entry in `questions` per decision: a short `id`, the `question`, `options` as `{label, description}` with the tradeoff in `description`, and `recommended` set to the index of your recommended option. Set `multi: true` when several answers can hold together (for example the folders to ignore). Do not add an "Other" option: omp adds one.
- **VS Code agent (Copilot):** the `vscode_askQuestions` tool ("Ask Clarifying Questions"). One entry in `questions` per decision: a unique `header` of at most 50 characters, a `question` of at most 200 characters, `options` as `{label, description}`, and `recommended: true` on your recommended option. Set `multiSelect: true` when several answers can hold together. Leave free-form answers allowed.
- **No question tool:** write the round as a numbered list, each question with options `a)`, `b)`, … and a line `➡️ <your recommendation and why>`, and end the message there.

If the developer said not to ask, use your recommendations and list them in the report.
