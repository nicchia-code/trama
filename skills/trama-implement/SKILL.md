---
name: trama-implement
description: Use when asked to implement, work on or execute a Trama Task (or the next Task in "todo") in a project with a `.trama/` folder. Writes the code so the behaviour matches the Model and the construction follows the Requirements, and stops and files a Drift if either cannot be followed.
---

# Trama: implement

You implement one **Task** so that the code behaves as the **Model** says and is built as the **Requirements** say. The Model wins. If following it or a Requirement is impossible, or you discover it is wrong or incomplete in an important way, you **stop working on that Task** and file a **Drift**: you never silently deviate and you never edit the Model or the Requirements. The Drift blocks the Task and the other Tasks that concern the same thing, and it ends the run: you take no further Task, blocked or not.

## Tools or CLI

If you have the Trama tools (`trama_view`, `trama_board`, `trama_proposal_new`, …, offered by VS Code or by an MCP server), use them; otherwise run the `trama` CLI in a terminal. The steps below name the CLI command; this is the tool that does the same:

| CLI | Tool |
|---|---|
| `trama system`, `trama feature <id>`, `trama machine <id>`, `trama state <ref>`, `trama event <ref>` | `trama_view` with `ref` (no `ref` for the System); Feature, Machine and State views end with the Requirements attached |
| `trama requirements`, `trama requirements <area>`, `trama requirements <ref>` | `trama_view` with `ref` `requirements`, `requirements/<area>`, or the Model `ref` |
| `trama paths`, `trama analyze`, `trama search`, `trama validate` | `trama_paths`, `trama_analyze`, `trama_search`, `trama_validate` |
| `trama board`, `trama task list`, `trama drift list`, `trama proposal list` | `trama_board` |
| `trama announce <kind> "<title>"` (kind: `proposal`, `task`, `drift`) | `trama_announce` |
| `trama proposal new` | `trama_proposal_new` |
| `trama proposal edit`, then editing the printed file | `trama_proposal_write` with the complete new file |
| `trama proposal delete`, `trama proposal show` | `trama_proposal_delete_file`, `trama_proposal_show` |
| `trama proposal submit <id>` | `trama_proposal_submit` |
| `trama task new`, `trama task show`, `trama task move` | `trama_task_new`, `trama_task_show`, `trama_task_move` |
| `trama drift new`, `trama drift show` | `trama_drift_new`, `trama_drift_show` |

There is no tool for approving, rejecting, discarding or resolving: those are the developer's decisions.

A new Proposal starts as a **Draft**, not approvable. Finish every file, validate and read the changes before `trama proposal submit <id>` (or `trama_proposal_submit`). If submission is refused, fix the reported problems, validate and review again, then retry. Only after it succeeds attach it to a Drift and tell the developer to review it. Before every later file change, call `trama proposal edit` or `trama_proposal_write` again: it returns an open Proposal to Draft, so submit again when finished.

## Announcing cards

When you know you must file a Drift (see "When you must file a Drift"), announce it before you write it up: `trama announce drift "<title>"` (or `trama_announce`) prints an announcement ID. Pass it when you file the Drift: `trama drift new … --announcement <id>` (the `announcement` field of `trama_drift_new`); if the Drift carries a Proposal, announce that too and pass its ID to `trama proposal new`. The Board shows a ghost of each card meanwhile. Never wait for a ghost to show and never skip or delay a card because of it; an unknown ID is only noted in the output.

## Hard rules

- NEVER edit `.trama/model/`, `.trama/requirements/` or the generated `trama-req-*` skills.
- NEVER run `trama proposal approve`, `trama proposal reject`, `trama proposal discard` or `trama drift resolve`.
- NEVER implement behaviour that contradicts the Model, or code that contradicts a Requirement, to get something working.
- Do not touch code unrelated to the Task.

## Steps

1. **Pick the Task.** Use the ID you were given, or `trama task list --column todo` and take the first one, in order. Do not pass over a Task marked "(blocked by Drift …)" or "(waiting for Task …)": a blocked Task cannot be started by you, only the developer can decide on its Drift, and it ends the run (step 2). Read it: `trama task show <id>`. It shows the current text of every Model element and Requirement it references, then under `## Requirements` every Requirement attached to those elements and the Areas whose General Requirements apply. A Technical Task references no Model element; implement it as a normal engineering task, following the Requirements it references, and skip steps 3 and 5.
2. **Start it.** `trama task move <id> doing`. If the move is refused because the Task is blocked, nothing changed: stop. Take no further Task, whether it is the one you were given or the next of a run, and report the Task and the Drift (or fix Task) the refusal names.
3. **Understand the surroundings before coding.** For each reference: `trama state <machine/State>` (what leaves it, including inherited Transitions, and what enters it), `trama event <owner.EVENT>` (who emits it and every Machine that reacts), and `trama paths <machine> <from> <to>` for the routes through it. Also read the Machine description with `trama machine <id>`. Decide which code already implements this Machine, and follow its conventions.
4. **Implement.** Write the code, including every Transition's condition and consequence exactly as the prose says, and the States around it that the Task depends on. Follow every Requirement listed by `task show`, and load the `trama-req-<area>` skills it names for the General ones. Add or update tests for the behaviour. Run the project's own tests, linter and build as usual.
5. **Check against the Model and Requirements.** Walk the referenced States and Transitions once more and confirm each is reachable and does what the prose says, including the failure and alternative Transitions from the same State. Then go through the Requirements and confirm the code follows each one.
6. **Finish.** `trama task move <id> done`. Report what you implemented, in domain terms, and anything you noticed that was outside the Task. If you were asked for several Tasks, take the next one in order; the run ends when none is left or at the first Drift.

## When you must file a Drift

Stop working on the Task at once and file a Drift when any of these is true:

- The Model cannot be implemented as written (contradiction, impossible condition, an Event nothing can emit).
- The Model is silent on a case that the Task forces you to handle, and the choice changes what the user sees or what data is kept.
- Doing the Task right requires a State or Transition the Model does not have.
- A Requirement cannot be followed (it conflicts with the Model, another Requirement, or the platform), or the Task forces a construction choice the Requirements should decide and do not.

Then:

1. Decide which case applies. If the code is right and the Model forgot a case, first create a Proposal with the `trama-design` skill, without its interview (list your choices in the Proposal body). Finish its files, validate, read it and submit it before attaching it to the Drift; correct and retry any refusal. Otherwise there is no Proposal.
2. File the Drift **once**: `trama drift new "<title>" --ref <nearest Model element or Requirement> --task <id of the Task you are implementing> --happens "<what the code does or what you would do instead, in terms of behaviour>" --should "<what the Model or Requirement says and why it cannot be followed>" [--where "<where in the code>"]` (the tool's `task`, `happens`, `should` and `where` fields are the same), adding `--proposal <id>` only in the first case. The two texts are required; `--where` is optional and the only place for code locations. Write them as described in "Writing a Drift". `--task` records the origin: the Drift blocks that Task. `trama drift new` always creates a new card, so never run it twice for the same problem.
3. Leave the Task in `doing`; the developer decides whether the code or the Model changes. Stop the run here: take no further Task, blocked or not, even one that concerns something else.
4. Report. Say what you implemented and the Drift that stopped the run, with the Task it concerns.

Small choices that stay below Diagram level and that no Requirement covers (names, data structures, how an effect is carried out) are yours to make; do not file Drifts for them.

## Writing a Drift

The developer reads a Drift at a glance, as a programmer, but not as a code review. Write the two sides at the level of behaviour.

- **Say what the System does and what it should do**, in the words of the domain ("the cart total ignores the coupon"), not how the code does it.
- **Name no variable, function, class, field or file** in `--happens` or `--should`, unless the difference cannot be understood without it. Then name only the one or two that matter, as `inline code`.
- **Code locations go only in `--where`** (the tool's `where` field), which is optional: the files, and the code element when it helps. No line numbers, which go stale, and no long pieces of code.
- **Use short Markdown:** short paragraphs, a bulleted list when there are several separate points, **bold** for the one or two terms that carry the difference. No headings inside a section, no tables, about 100 words per side.
