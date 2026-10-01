---
name: trama-design
description: Use when the user wants to add, change or think through behaviour of a project that has a `.trama/` folder: new feature, new state, edge cases, "what happens when…". Turns the conversation into a Trama Proposal for the Model. Not for writing code.
---

# Trama: design

The **Model** in `.trama/model/` is the source of truth for how the System behaves. You change it only through a **Proposal** that the developer approves as a whole. You never write code in this skill.

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

- NEVER edit `.trama/model/` directly. Every change goes through a Proposal, created with `trama proposal new`.
- NEVER run `trama proposal approve`, `trama proposal reject` or `trama drift resolve`. Those are the developer's decisions. After writing a Proposal, stop and ask the developer to review it.
- The Model describes *what can happen*, never *how it is built*: no variables, field names, database columns, endpoints, classes or file paths. A State is a situation in domain words ("Awaiting payment"), not a combination of values.
- Conditions and consequences of a Transition are plain prose after the colon.

## Steps

1. **Explore before proposing.** `trama system`, then `trama search <word>` for what already exists, then `trama feature <id>`, `trama machine <id>`, `trama state <machine/State>`, `trama event <owner.EVENT>`. Reuse existing Machines, Actors and Events instead of duplicating them. Add `--json` if you need structured data.
2. **Find the gaps with the developer.** Ask short, concrete questions about what the conversation leaves open: what if it fails, is cancelled, times out, happens twice, arrives out of order? Use `trama paths <machine> <from> <to>` to show the routes that already exist. Do not invent behaviour the developer has not confirmed.
3. **Open a Proposal** for one coherent change, which may touch several Machines and Features: `trama proposal new "<title>" --body "<why>"`.
4. **Edit files through it.** For each Model file: `trama proposal edit <id> <model-path>` (for example `checkout/order.md`) prints the path to edit. An existing file arrives pre-filled; a new file arrives empty. To remove a file: `trama proposal delete <id> <model-path>`. Write files as described in [FORMAT.md](./FORMAT.md). Always write the **complete** new version of a file.
5. **Validate until clean.** `trama validate --proposal <id>` must report no errors. Then `trama proposal show <id>` and read the structural changes: they must match what you meant, and nothing else.
6. **Hand over.** Summarise the Proposal in a few lines: what States, Transitions and Events are added or changed, and any question you left open. Tell the developer to review it on the board or with `trama proposal show <id>`, and stop.

## When a Proposal comes back

If the developer rejected it, the reason is under `## Feedback` in `trama proposal show <id>`. Do not patch the rejected Proposal: open a **new** one that addresses the feedback. A stale Proposal (the Model changed under it) is also replaced by a new one.

## Good Model habits

- One Machine per kind of thing (Order, Payment, Cart), not per screen step. UI behaviour gets its own Machine when it has its own States (for example a checkout form), and talks to the domain only through Events.
- Name Events as facts that happened (`PAYMENT_SUCCEEDED`), owned by whoever emits them. Something outside the System (user, payment provider, time) is an Actor and only emits.
- Use sub-States to zoom in (`Paid` contains `Preparing` and `Ready to ship`), not to model parallelism; parallel things are separate Machines.
- Every Machine has exactly one `(initial)` State per level. End states are `(final)` and have no outgoing Transitions.
- After the Proposal is approved, `trama analyze` shows unreachable States, dead ends and Events nobody receives. Fix those through another Proposal if they are real.
