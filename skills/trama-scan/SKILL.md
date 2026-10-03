---
name: trama-scan
description: Use when asked to scan, sync or compare a Feature (or the whole System) of a project with a `.trama/` folder against its code, typically after a Trama Proposal was approved. Checks behaviour against the Model and construction against the Requirements. Produces Tasks for missing work and Drifts for differences. Does not change code, the Model or the Requirements.
---

# Trama: scan

A **Scan** compares the Model (source of truth for behaviour) and its **Requirements** (how it must be built) with the existing code, for one **Feature** or, on request, the whole System. You produce **Tasks** (work to do) and **Drifts** (differences the developer must decide on). You change neither code, nor Model, nor Requirements.

## Tools or CLI

If you have the Trama tools (`trama_view`, `trama_board`, `trama_proposal_new`, …, offered by VS Code or by an MCP server), use them; otherwise run the `trama` CLI in a terminal. The steps below name the CLI command; this is the tool that does the same:

| CLI | Tool |
|---|---|
| `trama system`, `trama feature <id>`, `trama machine <id>`, `trama state <ref>`, `trama event <ref>` | `trama_view` with `ref` (no `ref` for the System); Feature, Machine and State views end with the Requirements attached |
| `trama requirements`, `trama requirements <area>`, `trama requirements <ref>` | `trama_view` with `ref` `requirements`, `requirements/<area>`, or the Model `ref` |
| `trama paths`, `trama analyze`, `trama search`, `trama validate` | `trama_paths`, `trama_analyze`, `trama_search`, `trama_validate` |
| `trama board`, `trama task list`, `trama drift list`, `trama proposal list` | `trama_board` |
| `trama proposal new` | `trama_proposal_new` |
| `trama proposal edit`, then editing the printed file | `trama_proposal_write` with the complete new file |
| `trama proposal delete`, `trama proposal show` | `trama_proposal_delete_file`, `trama_proposal_show` |
| `trama proposal submit <id>` | `trama_proposal_submit` |
| `trama task new`, `trama task show`, `trama task move` | `trama_task_new`, `trama_task_show`, `trama_task_move` |
| `trama drift new`, `trama drift show` | `trama_drift_new`, `trama_drift_show` |

There is no tool for approving, rejecting, discarding or resolving: those are the developer's decisions.

A new Proposal starts as a **Draft**, not approvable. Finish every file, validate and read the changes before `trama proposal submit <id>` (or `trama_proposal_submit`). If submission is refused, fix the reported problems, validate and review again, then retry. Only after it succeeds attach it to a Drift and tell the developer to review it. Before every later file change, call `trama proposal edit` or `trama_proposal_write` again: it returns an open Proposal to Draft, so submit again when finished.

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
   **The design link.** When the prompt says the scan follows the approval of a Proposal, add `--proposal <id>` (the `proposal` field of `trama_task_new`) to every Task you file, so the Board shows the Tasks of one design together. File Tasks with no `--proposal` when the prompt names no Proposal (a scan the developer started by hand).
6. **File each Drift exactly once, in one of two ways.** `trama drift new` always creates a new card, so decide which way applies before running it.
   - **Ordinary Drift** (the default): `trama drift new "<title>" --ref <nearest Model element or Requirement> --body "<what the code does, what the Model or Requirement says, where in the code you saw it>"`. Code paths belong here, and only here. Do not pass `--task`: a Drift filed by a Scan has no origin Task. Do not choose the resolution.
   - **Drift with a Proposal**, only when the code handles an important case the Model forgot: first create the Proposal by following the `trama-design` skill without its interview (`trama proposal new`, `edit`, `validate --proposal`, `proposal show`, `proposal submit`; list your choices in the Proposal body). Correct and retry a refused submission before continuing; only after it succeeds run `trama drift new … --proposal <id>` once, with the same body. Never run `drift new` a second time for the same difference.

   Do not open a Proposal for small differences: the default is that the code gets fixed.
7. **Report.** List the Tasks and Drifts you created with their IDs, Machines you could not find any code for, and Model warnings from `analyze`. Say which Drifts need a decision. Then stop.

## Judgement

- Unsure whether code is a Drift or only an implementation detail? Ask: would drawing it change the Diagram? If not, skip it.
- If you cannot tell whether the code implements a Transition, say so in the report instead of guessing a Task or a Drift.
- **No code at all is an answer, not a blocker.** If, after step 3, the project has no source files (only `.trama/`, agent skill folders and editor or tool settings), it is a greenfield: the whole Model is still to be built. Do not stop and ask where the code lives. Treat every State and Transition as missing and go to step 5: skip what an open or in-progress Task already covers, then file one Task per coherent unit (usually one per Machine, or per group of States if the Machine is large), each with a `--ref` for every State and Transition it covers and for the Requirement sections attached to them. If the `tech` Area or other General Requirements ask for setup (framework, project structure), file that first as a technical Task referencing them. Say in the report that the project had no code. A Drift needs code to differ from, so file none, and list existing Drifts whose code paths do not exist so the developer can dismiss them.
- Only ask a question when you truly cannot tell whether code exists, for example because the sources may live in another repository.
