---
name: trama-fix
description: Use when the developer describes a problem or a wrong behaviour in a project with a `.trama/` folder ("the cart total ignores the coupon", "cancelling twice crashes") and wants it turned into well-formed Trama Tasks. Finds where the code disagrees with the Model or Requirements, files Tasks (or a Drift when the Model itself is silent or wrong). Does not change code, the Model or the Requirements.
---

# Trama: fix

A **Fix** starts from a problem the developer describes in a line or two. You turn it into **Tasks** that are as elaborated as the ones a Scan files: they point to the Model elements and Requirements the problem belongs to, and say in domain words what must be true when they are done. You do **not** fix the code here; the developer runs the Tasks afterwards (the Board's Run, or the `trama-implement` skill).

The default is that the code is wrong, not the Model: someone who reports a problem expects the System to behave as the Model says. Only when the Model itself is silent or wrong do you stop and file a **Drift**.

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
| `trama ask --root <project>` (JSON request on stdin) | `trama_ask` |

There is no tool for approving, rejecting, discarding or resolving: those are the developer's decisions.

A new Proposal starts as a **Draft**, not approvable. Finish every file, validate and read the changes before `trama proposal submit <id>` (or `trama_proposal_submit`). If submission is refused, fix the reported problems, validate and review again, then retry. Only after it succeeds attach it to a Drift and tell the developer to review it. Before every later file change, call `trama proposal edit` or `trama_proposal_write` again: it returns an open Proposal to Draft, so submit again when finished.

## Hard rules

- NEVER edit code, `.trama/model/`, `.trama/requirements/` or the generated `trama-req-*` skills.
- NEVER run `trama proposal approve`, `trama proposal reject`, `trama proposal discard` or `trama drift resolve`.
- NEVER file a Task you could not tie to the problem the developer described. Do not widen the Fix into a Scan of everything around it.
- NEVER link the Tasks you file to a Proposal: do not pass `--proposal` to `trama task new`. A Fix's Tasks belong to no design. (Only a Drift you file with a Proposal carries one; see below.)
- Compare behaviour at the level of the **Diagram**: States, Transitions, Events. Variable names, structure and style that no Requirement mentions are not worth a Task.

## Steps

1. **Understand the problem.** Read the description you were given. Then explore, before asking anything: `trama search <word>` for what the Model and Requirements say about it, `trama feature <id>`, `trama machine <id>`, `trama state <machine/State>`, `trama event <owner.EVENT>`, `trama requirements <area>`; keep the Areas' `## General` Requirements in mind. Facts are your job: never ask the developer anything the Model, the Requirements or the code can tell you.
2. **Avoid duplicates.** `trama task list` and `trama drift list`. If a Task or Drift already covers the problem, do not file another: tell the developer which one does.
3. **Find it in the code.** Search the code yourself for where the described behaviour lives and what it does. The Model carries no code hints.
4. **Ask when you must.** If after steps 1 to 3 something that decides what the Task says is still open (two readings of the problem, what the user should see instead, how to reproduce it, where in the System it happens), ask the developer, in as many rounds as you need and no more. See "Asking". When the developer cannot tell, choose the most likely reading and write it into the Task as an assumption.
5. **Decide the outcome** for each coherent piece of the problem:

| You find | You file |
|---|---|
| The code contradicts what a State or Transition of the Model says, or lacks one | a **Task** referencing those Model elements |
| The code contradicts or ignores a Requirement | a **Task** referencing the Requirement, together with the Model element it applies to when there is one (a **Technical** Task when it references only Requirements) |
| The problem belongs to nothing in the Model or Requirements (a crash, a broken dependency, a wrong rounding no Requirement mentions) | a **Technical** Task with no references |
| The Model is silent on the case the developer describes, or says something the developer says is wrong | a **Drift** (see below) |

6. **File Tasks.** One Task per coherent unit of work, as specific as possible in `--ref`:
   `trama task new "<what must be fixed>" --ref order/Paid/user.CANCEL --ref requirements/ui#order/Paid --body "<in domain words>"`.
   Reference the Requirement sections the Task must satisfy next to the Model elements. The body says *what*, in domain words, never which files to touch: for a Task tied to the Model, what must be true when done; for a Technical Task with no references, the symptom, the behaviour expected instead, and how to reproduce it. Write down any assumption you made. If the developer's description holds several unrelated problems, file separate Tasks.
7. **File a Drift only when the Model has to decide.** Run `trama drift new "<title>" --ref <nearest Model element or Requirement> --body "<what the developer reports, what the Model or Requirement says (or does not), where in the code you saw it>"`. Code paths belong here, and only here. Do not pass `--task`: a Drift filed by a Fix has no origin Task. Do not choose the resolution. When the code handles an **important** case the Model forgot (real user-visible or data-affecting behaviour), first create a Proposal by following the `trama-design` skill without its interview (`trama proposal new`, `edit`, `validate --proposal`, `proposal show`, `proposal submit`; list your choices in the Proposal body). Correct and retry a refused submission before continuing; only after it succeeds run `trama drift new … --proposal <id>` once. `trama drift new` always creates a new card, so never run it twice for the same difference. A Drift that blocks the described fix also stops the Tasks that depend on it: do not file Tasks for that piece.
8. **Report.** List the Tasks and Drifts you created with their IDs, what you assumed, and what you found out of scope. Say which Drifts need a decision and that the Tasks wait in To do. Then stop.

## Asking

Put every open question whose meaning does not depend on another answer in **one** round, each with 2 to 5 concrete options, their tradeoffs in a few words, and your recommendation; then stop and wait.

Use **`trama_ask` first**, whether offered natively by VS Code or through MCP. If it is not offered, run **`trama ask --root <project>`** with the same JSON request on stdin.

- Send `{questions: [...]}` with a unique non-empty `id`, `question`, `options` as `{label, description}`, a zero-based `recommended` index, and an explicit `multi` boolean for every question. Set `multi: true` only when several answers can hold together. Do not supply "Other": Trama adds it.
- A result with `status: "answered"` contains `answers` keyed by question id. An answered entry has the original `selected` labels and optional free-form `text`; a `status: "skipped"` entry is an explicit developer skip. Use the recommendation for that skipped decision, report it as an assumption for review, and do not ask it again.
- An `invalid-input` error means the request was refused before opening a round: correct the identified field and submit the corrected request.
- An **`editor-interrupted` error stops this workflow immediately**. Do not use partial answers or recommendations, fall back, retry, reroute, resume the round, or create Tasks or Proposals from its unanswered decisions. Report that the editor was lost.
- Only an initial `status: "unavailable"` result permits the agent-specific fallback below. Prefer its question tool; use text only if that tool is absent.

- **omp:** the `ask` tool. One entry in `questions` per decision: a short `id`, the `question`, `options` as `{label, description}` with the tradeoff in `description`, and `recommended` set to the index of your recommended option. Do not add an "Other" option: omp adds one.
- **VS Code agent (Copilot):** the `vscode_askQuestions` tool. One entry in `questions` per decision: a unique `header` of at most 50 characters, a `question` of at most 200 characters, `options` as `{label, description}`, and `recommended: true` on your recommended option. Leave free-form answers allowed.
- **No question tool** (another agent, or a non-interactive run): write the round as a numbered list, each question with its options as `a)`, `b)`, … and a line `➡️ <your recommendation and why>`. End the message there.

## Judgement

- Would drawing it change the Diagram? If not, and no Requirement mentions it, it is a Technical Task with no references, not a Drift.
- Unsure whether the code implements a Transition? Say so in the Task body or the report instead of guessing.
- A problem the code cannot show (the code looks right and the Model agrees) is not a Task: report it, say what you checked, and ask the developer for how to reproduce it.
- If the project has no source files, there is nothing to fix: say so and stop.
