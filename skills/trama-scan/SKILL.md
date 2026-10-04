---
name: trama-scan
description: Use when asked to scan, sync or compare a Feature (or the whole System) of a project with a `.trama/` folder against its code, typically after a Trama Proposal was approved. Checks behaviour against the Model and construction against the Requirements. Produces Tasks for missing work and Drifts for differences. Does not change code, the Model or the Requirements.
---

# Trama: scan

A **Scan** compares the Model (source of truth for behaviour) and its **Requirements** (how it must be built) with the existing code, for one **Feature** or, on request, the whole System. You produce **Tasks** (work to do) and **Drifts** (differences the developer must decide on). You change neither code, nor Model, nor Requirements.

## Hand-over

A new Proposal starts as a **Draft**, not approvable. Finish every file, validate and read the changes before `trama proposal submit <id>`. If submission is refused, fix the reported problems, validate and review again, then retry. Only after it succeeds attach it to a Drift and tell the developer to review it. Before every later file change, call `trama proposal edit` again: it returns an open Proposal to Draft, so submit again when finished.

## Announcing cards

As soon as you know you will file a Task or a Drift, announce it: `trama announce task "<title>"` or `trama announce drift "<title>"` prints an announcement ID. Pass it when you file that card: `trama task new … --announcement <id>` or `trama drift new … --announcement <id>`. A Drift with a Proposal means two cards: announce the Proposal as well and pass its ID to `trama proposal new`. The Board shows a ghost of each card meanwhile. Never wait for a ghost to show and never skip or delay a card because of it; an unknown ID is only noted in the output.

## Hard rules

- NEVER edit code, `.trama/model/` or `.trama/requirements/` in this skill.
- NEVER run `trama proposal approve`, `trama proposal reject`, `trama proposal discard` or `trama drift resolve`.
- Compare behaviour at the level of the **Diagram**: States, Transitions, Events, who reacts to what. Compare construction against what the Requirements actually state. Variable names, structure, style and performance that no Requirement mentions are not Drifts.
- The Model matters far more than the code. By default the code is wrong, not the Model.

## Steps

1. **Scope.** Use the Feature you were given, or `trama system` for the list. For each Machine: `trama feature <id>`, `trama machine <id>`, `trama state <machine/State>`, `trama event <owner.EVENT>`, `trama paths …` as needed; these views end with the Requirements attached. Read the Areas with `trama requirements` and `trama requirements <area>`, and keep their `## General` sections in mind for everything. Also run `trama analyze <machine>`: warnings are Model problems to tell the developer about, not code problems.
2. **Avoid duplicates.** `trama task list` and `trama drift list` first. Do not file what is already there.
3. **Find the implementation.** Search the code yourself for where each Machine lives: handlers, reducers, components, routes, jobs, database transitions. The Model carries no code hints; do not expect any. If there are no source files at all, see "No code at all" under Judgement.
4. **Compare each Machine** State by State and Transition by Transition, then each Requirement that applies, and decide:

| You find | You file |
|---|---|
| A State, Transition or Event in the Model that the code lacks | a **Task** |
| A Requirement the code does not implement yet (a screen without the required layout, a missing limit, a library not adopted) | a **Task** referencing the Requirement |
| Code that does something the Model says differently, or something extra that would add or change a State or Transition in the Diagram | a **Drift** |
| Code that contradicts a Requirement (uses a forbidden library, shows a different layout, applies another formula) | a **Drift** referencing the Requirement |
| Code that handles a case the Model forgot, and it looks **important** (real user-visible or data-affecting behaviour, not a detail) | a **Drift with an attached Proposal** |
| Anything below Diagram level that no Requirement mentions | nothing |

5. **File Tasks.** One Task per coherent unit of work (typically a State with its Transitions), as specific as possible in `--ref`:
   `trama task new "<what to implement>" --ref order/Refunding --ref order/Paid/user.CANCEL --ref requirements/ui#order/Paid --body "<in domain words: what must be true when done>"`.
   Reference the Requirement sections the Task must satisfy next to the Model elements. A Task that only applies Requirements without changing behaviour (for example adopting the required theme everywhere) is technical: `--technical --ref requirements/ui#General`.
   The body says *what*, in domain words, not which files to touch.
   **The design link.** When the prompt says the scan follows the approval of a Proposal, add `--proposal <id>` to every Task you file, so the Board shows the Tasks of one design together. File Tasks with no `--proposal` when the prompt names no Proposal (a scan the developer started by hand).
6. **File each Drift exactly once, in one of two ways.** `trama drift new` always creates a new card, so decide which way applies before running it.
   - **Ordinary Drift** (the default): `trama drift new "<title>" --ref <nearest Model element or Requirement> --happens "<what the code does, in terms of behaviour>" --should "<what the Model or Requirement says>" --option "<title of the way you recommend>" --option-text "<what it changes and costs>" --option "<title of another way>" --option-text "<…>" [up to five] [--where "<where in the code you saw it>"]`. The two texts and the options are required; `--where` is optional and the only place for code locations. Write them as described in "Writing a Drift". Do not pass `--task`: a Drift filed by a Scan has no origin Task. Do not choose the resolution.
   - **Drift with a Proposal**, only when the code handles an important case the Model forgot: first create the Proposal by following the `trama-design` skill without its interview (`trama proposal new`, `edit`, `validate --proposal`, `proposal show`, `proposal submit`; list your choices in the Proposal body). Correct and retry a refused submission before continuing; only after it succeeds run `trama drift new … --proposal <id>` once, with the same texts and options. Never run `drift new` a second time for the same difference.

   Do not open a Proposal for small differences: the default is that the code gets fixed.
7. **Report.** List the Tasks and Drifts you created with their IDs, Machines you could not find any code for, and Model warnings from `analyze`. Say which Drifts need a decision. Then stop.

## Judgement

- Unsure whether code is a Drift or only an implementation detail? Ask: would drawing it change the Diagram? If not, skip it.
- If you cannot tell whether the code implements a Transition, say so in the report instead of guessing a Task or a Drift.
- **No code at all is an answer, not a blocker.** If, after step 3, the project has no source files (only `.trama/`, agent skill folders and editor or tool settings), it is a greenfield: the whole Model is still to be built. Do not stop and ask where the code lives. Treat every State and Transition as missing and go to step 5: skip what an open or in-progress Task already covers, then file one Task per coherent unit (usually one per Machine, or per group of States if the Machine is large), each with a `--ref` for every State and Transition it covers and for the Requirement sections attached to them. If the `tech` Area or other General Requirements ask for setup (framework, project structure), file that first as a technical Task referencing them. Say in the report that the project had no code. A Drift needs code to differ from, so file none, and list existing Drifts whose code paths do not exist so the developer can dismiss them.
- Only ask a question when you truly cannot tell whether code exists, for example because the sources may live in another repository.

## Writing a Drift

The developer reads a Drift at a glance, as a programmer, but not as a code review. Write the two sides, and the fix options, at the level of behaviour.

- **Say what the System does and what it should do**, in the words of the domain ("the cart total ignores the coupon"), not how the code does it.
- **Name no variable, function, class, field or file** in `--happens`, `--should` or the options, unless the difference cannot be understood without it. Then name only the one or two that matter, as `inline code`.
- **Code locations go only in `--where`**, which is optional: the files, and the code element when it helps. No line numbers, which go stale, and no long pieces of code.
- **Give two to five fix options**, the one you recommend first: each `--option "<title>"` is followed by its `--option-text "<text>"`. Each is a different way to reach what should happen, not a step of one plan, and says in terms of behaviour what changes and what it costs. About 60 words each, short Markdown, no headings or tables inside an option. Titles differ. A Drift filed with fewer than two, more than five, or an option missing its title or text is refused.
- **Use short Markdown:** short paragraphs, a bulleted list when there are several separate points, **bold** for the one or two terms that carry the difference. No headings inside a section, no tables, about 100 words per side.
