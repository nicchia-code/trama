---
name: trama-implement
description: Use when asked to implement, work on or execute a Trama Task (or the next Task in "todo") in a project with a `.trama/` folder. Writes the code so the behaviour matches the Model, and stops and files a Drift if the Model cannot be followed.
---

# Trama: implement

You implement one **Task** so that the code behaves as the **Model** says. The Model wins. If following it is impossible, or you discover it is wrong or incomplete in an important way, you **stop** and file a **Drift**: you never silently deviate and you never edit the Model.

## Tools or CLI

If you have the Trama tools (`trama_view`, `trama_board`, `trama_proposal_new`, …, offered by VS Code or by an MCP server), use them; otherwise run the `trama` CLI in a terminal. The steps below name the CLI command; this is the tool that does the same:

| CLI | Tool |
|---|---|
| `trama system`, `trama feature <id>`, `trama machine <id>`, `trama state <ref>`, `trama event <ref>` | `trama_view` with `ref` (no `ref` for the System) |
| `trama paths`, `trama analyze`, `trama search`, `trama validate` | `trama_paths`, `trama_analyze`, `trama_search`, `trama_validate` |
| `trama board`, `trama task list`, `trama drift list`, `trama proposal list` | `trama_board` |
| `trama proposal new` | `trama_proposal_new` |
| `trama proposal edit`, then editing the printed file | `trama_proposal_write` with the complete new file |
| `trama proposal delete`, `trama proposal show` | `trama_proposal_delete_file`, `trama_proposal_show` |
| `trama task new`, `trama task show`, `trama task move` | `trama_task_new`, `trama_task_show`, `trama_task_move` |
| `trama drift new`, `trama drift show` | `trama_drift_new`, `trama_drift_show` |

There is no tool for approving, rejecting or resolving: those are the developer's decisions.

## Hard rules

- NEVER edit `.trama/model/`.
- NEVER run `trama proposal approve`, `trama proposal reject` or `trama drift resolve`.
- NEVER implement behaviour that contradicts the Model to get something working.
- Do not touch code unrelated to the Task.

## Steps

1. **Pick the Task.** Use the ID you were given, or `trama task list --column todo` and take the first one. Read it: `trama task show <id>`. It shows the current Model text of every reference. A Technical Task has no references; implement it as a normal engineering task and skip steps 3 and 5.
2. **Start it.** `trama task move <id> doing`.
3. **Understand the surroundings before coding.** For each reference: `trama state <machine/State>` (what leaves it, including inherited Transitions, and what enters it), `trama event <owner.EVENT>` (who emits it and every Machine that reacts), and `trama paths <machine> <from> <to>` for the routes through it. Also read the Machine description with `trama machine <id>`. Decide which code already implements this Machine, and follow its conventions.
4. **Implement.** Write the code, including every Transition's condition and consequence exactly as the prose says, and the States around it that the Task depends on. Add or update tests for the behaviour. Run the project's own tests, linter and build as usual.
5. **Check against the Model.** Walk the referenced States and Transitions once more and confirm each is reachable and does what the prose says, including the failure and alternative Transitions from the same State.
6. **Finish.** `trama task move <id> done`. Report what you implemented, in domain terms, and anything you noticed that was outside the Task.

## When you must stop

Stop at once and file a Drift when any of these is true:

- The Model cannot be implemented as written (contradiction, impossible condition, an Event nothing can emit).
- The Model is silent on a case that the Task forces you to handle, and the choice changes what the user sees or what data is kept.
- Doing the Task right requires a State or Transition the Model does not have.

Then:

1. Decide which case applies. If the code is right and the Model forgot a case, first create a Proposal with the `trama-design` skill. Otherwise there is no Proposal.
2. File the Drift **once**: `trama drift new "<title>" --ref <nearest Model element> --body "<what the Model says, why it cannot be followed, what you would do instead, where in the code>"`, adding `--proposal <id>` only in the first case. `trama drift new` always creates a new card, so never run it twice for the same problem.
3. Leave the Task in `doing`. Report the Drift ID and stop. The developer decides whether the code or the Model changes.

Small choices that stay below Diagram level (names, data structures, how an effect is carried out) are yours to make; do not file Drifts for them.
