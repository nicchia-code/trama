---
name: trama-design
description: Use when the user wants to add, change or think through behaviour of a project that has a `.trama/` folder, or how it must be built (interface, technology, quality, data, business rules): new feature, new state, edge cases, "what happens when…", "the screen should look…". Turns the conversation into a Trama Proposal for the Model and its Requirements. Not for writing code.
---

# Trama: design

The **Model** in `.trama/model/` is the source of truth for how the System behaves. Next to it, the **Requirements** in `.trama/requirements/` say how it must be built: one file per **Area** (by default `ui`, `tech`, `quality`, `data`, `rules`). You change both only through a **Proposal** that the developer approves as a whole. You never write code in this skill.

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
| `trama task new`, `trama task show`, `trama task move` | `trama_task_new`, `trama_task_show`, `trama_task_move` |
| `trama drift new`, `trama drift show` | `trama_drift_new`, `trama_drift_show` |

There is no tool for approving, rejecting or resolving: those are the developer's decisions.

## Hard rules

- NEVER edit `.trama/model/` or `.trama/requirements/` directly, nor the generated `trama-req-*` skills. Every change goes through a Proposal, created with `trama proposal new`.
- NEVER run `trama proposal approve`, `trama proposal reject` or `trama drift resolve`. Those are the developer's decisions. After writing a Proposal, stop and ask the developer to review it.
- The Model describes *what can happen*, never *how it is built*: no variables, field names, database columns, endpoints, classes or file paths. A State is a situation in domain words ("Awaiting payment"), not a combination of values. How it is built (layout, styling, libraries, limits, data fields, formulas) belongs in the Requirements.
- Conditions and consequences of a Transition are plain prose after the colon.

## Steps

1. **Explore before proposing.** `trama system`, then `trama search <word>` for what already exists (it searches the Requirements too), then `trama feature <id>`, `trama machine <id>`, `trama state <machine/State>`, `trama event <owner.EVENT>`, and `trama requirements` for the Areas. Reuse existing Machines, Actors and Events instead of duplicating them. Add `--json` if you need structured data.
2. **Find the gaps with the developer.** Ask short, concrete questions about what the conversation leaves open: what if it fails, is cancelled, times out, happens twice, arrives out of order? Use `trama paths <machine> <from> <to>` to show the routes that already exist. Then ask how it must be built where it matters: what the screens look like, what data each thing holds, which rules and limits apply, which technology is required. Do not invent behaviour or Requirements the developer has not confirmed.
3. **Open a Proposal** for one coherent change, which may touch several Machines, Features and Areas: `trama proposal new "<title>" --body "<why>"`.
4. **Edit files through it.** For each Model file: `trama proposal edit <id> <model-path>` (for example `checkout/order.md`) prints the path to edit. For an Area: `trama proposal edit <id> requirements/<area>.md`. An existing file arrives pre-filled; a new file arrives empty. To remove a file: `trama proposal delete <id> <path>`. Write files as described in [FORMAT.md](./FORMAT.md). Always write the **complete** new version of a file. Put the Requirements the developer gave you in the same Proposal as the behaviour they belong to.
5. **Validate until clean.** `trama validate --proposal <id>` must report no errors. A Requirement section titled with a State you removed or renamed is an error: update or remove that section in the same Proposal. Then `trama proposal show <id>` and read the changes: they must match what you meant, and nothing else.
6. **Hand over.** Summarise the Proposal in a few lines: what States, Transitions and Events are added or changed, which Requirements, and any question you left open. Tell the developer to review it on the board or with `trama proposal show <id>`, and stop.

## When a Proposal comes back

If the developer rejected it, the reason is under `## Feedback` in `trama proposal show <id>`. Do not patch the rejected Proposal: open a **new** one that addresses the feedback. A stale Proposal (the Model changed under it) is also replaced by a new one.

## Good Model habits

- One Machine per kind of thing (Order, Payment, Cart), not per screen step. UI behaviour gets its own Machine when it has its own States (for example a checkout form), and talks to the domain only through Events.
- Name Events as facts that happened (`PAYMENT_SUCCEEDED`), owned by whoever emits them. Something outside the System (user, payment provider, time) is an Actor and only emits.
- Use sub-States to zoom in (`Paid` contains `Preparing` and `Ready to ship`), not to model parallelism; parallel things are separate Machines.
- Every Machine has exactly one `(initial)` State per level. End states are `(final)` and have no outgoing Transitions.
- After the Proposal is approved, `trama analyze` shows unreachable States, dead ends and Events nobody receives. Fix those through another Proposal if they are real.

## Good Requirement habits

- Each Area file starts with a `description` saying when an agent needs it: Trama turns every Area into a `trama-req-<area>` skill with that description. Keep it about the kind of work ("Use when building or changing screens…").
- `## General` holds what applies everywhere in the Area. Any other `##` section is titled with a Model reference (`checkout`, `order`, `order/Paid`, `user.CANCEL`) and applies to that element and everything inside it.
- Screens and navigation are behaviour: model them as a UI Machine whose States are screens or visual states, and attach their look (layout, components, texts) as `ui` Requirements on those States.
- Write Requirements as short, checkable statements ("Amounts show two decimals and the currency symbol"), not wishes ("nice formatting").
- Data fields and formulas go in `data` and `rules`, attached to the Machine or State they concern, never in the Model.
- A new Area is a new file `requirements/<area>.md` with a kebab-case name, for example to split `ui` into `ui-web` and `ui-mobile`.
