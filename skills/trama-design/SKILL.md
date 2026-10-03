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
| `trama proposal submit <id>` | `trama_proposal_submit` |
| `trama task new`, `trama task show`, `trama task move` | `trama_task_new`, `trama_task_show`, `trama_task_move` |
| `trama drift new`, `trama drift show` | `trama_drift_new`, `trama_drift_show` |
| `trama drift replace-proposal <id> --proposal <p>` | `trama_drift_replace_proposal` |
| `trama ask --root <project>` (JSON request on stdin) | `trama_ask` |

There is no tool for approving, rejecting, discarding or resolving: those are the developer's decisions.

A new Proposal starts as a **Draft**, not approvable. Finish every file, validate and read the changes before `trama proposal submit <id>` (or `trama_proposal_submit`). If submission is refused, fix the reported problems, validate and review again, then retry. Only after it succeeds tell the developer to review it. Before every later file change, call `trama proposal edit` or `trama_proposal_write` again: it returns an open Proposal to Draft, so submit again when finished.

## Hard rules

- NEVER edit `.trama/model/` or `.trama/requirements/` directly, nor the generated `trama-req-*` skills. Every change goes through a Proposal, created with `trama proposal new`.
- NEVER run `trama proposal approve`, `trama proposal reject`, `trama proposal discard` or `trama drift resolve`. Those are the developer's decisions. After submitting a finished Proposal, stop and ask the developer to review it.
- The Model describes *what can happen*, never *how it is built*: no variables, field names, database columns, endpoints, classes or file paths. A State is a situation in domain words ("Awaiting payment"), not a combination of values. How it is built (layout, styling, libraries, limits, data fields, formulas) belongs in the Requirements.
- Conditions and consequences of a Transition are plain prose after the colon.

## Steps

1. **Explore before asking.** `trama system`, then `trama search <word>` for what already exists (it searches the Requirements too), then `trama feature <id>`, `trama machine <id>`, `trama state <machine/State>`, `trama event <owner.EVENT>`, and `trama requirements` for the Areas. Reuse existing Machines, Actors and Events instead of duplicating them. Add `--json` if you need structured data. Facts are your job: never ask the developer anything the Model, the Requirements or the code can tell you.
2. **Interview the developer in rounds** until every decision about the change is settled (see "The interview" below). Do not open a Proposal before that.
3. **Confirm the shared understanding.** Summarise what you will propose: the States, Transitions and Events added or changed, and the Requirements per Area. Ask the developer to confirm, and wait. A correction goes back to step 2.
4. **Open a Proposal** for one coherent change, which may touch several Machines, Features and Areas: `trama proposal new "<title>" --body "<why>"`. When the change is too large to review at once, split it into Proposals that build on each other: open the later ones with `--requires <id>` of the earlier ones; each is then written and validated on top of them and can only be approved after them.
5. **Edit files through it.** For each Model file: `trama proposal edit <id> <model-path>` (for example `checkout/order.md`) prints the path to edit. For an Area: `trama proposal edit <id> requirements/<area>.md`. An existing file arrives pre-filled; a new file arrives empty. To remove a file: `trama proposal delete <id> <path>`. Write files as described in [FORMAT.md](./FORMAT.md). Always write the **complete** new version of a file. Put the Requirements the developer gave you in the same Proposal as the behaviour they belong to.
6. **Validate until clean.** `trama validate --proposal <id>` must report no errors. A Requirement section titled with a State you removed or renamed is an error: update or remove that section in the same Proposal. Then `trama proposal show <id>` and read the changes: they must match what was agreed, and nothing else.
7. **Hand over.** Run `trama proposal submit <id>` only after step 6. If refused, correct its problems and repeat validation and review before retrying. After submission succeeds, summarise the Proposal in a few lines, tell the developer to review it on the board or with `trama proposal show <id>`, and stop.

## The interview

Treat the change as a tree of decisions: each answer opens the decisions that hang off it. Work it in rounds.

- **One round = every open decision whose prerequisites are settled.** Ask them all at once, not one per message. A question whose meaning depends on another answer of the same round ("if you pick 1b…") belongs to a later round: leave it out.
- **Every question offers 2 to 5 concrete, materially different options**, each with its tradeoff in a few words, and **your recommendation**. Put the whole round in **one** call of your question tool (see "Asking" below), then stop and wait for the answers.
- **Cover behaviour first:** what starts it, what if it fails, is cancelled, times out, happens twice or out of order, who is told. Use `trama paths <machine> <from> <to>` to show the routes that already exist.
- **Then how it is built, Area by Area,** where the change touches it: what the screens look like (`ui`), what each thing holds (`data`), which limits and formulas apply (`rules`), required technology (`tech`), quality goals (`quality`). Skip Areas the change does not touch.
- **After each round** recompute what is open; answers often settle or remove other questions. The interview ends when nothing is left open or silently assumed.
- Never invent behaviour or Requirements the developer has not confirmed.

Skip the interview only when the developer says so ("don't ask, decide"), or when another Trama skill sends you here to attach a Proposal to a Drift. Then make reasonable choices and list each one, in the Proposal body and in your hand-over, as a decision for the developer to check.

### Asking

Use **`trama_ask` first**, whether offered natively by VS Code or through MCP. If it is not offered, run **`trama ask --root <project>`** with the same JSON request on stdin.

- Send one complete round as `{questions: [...]}`. Every question has a unique non-empty `id`, `question`, `options` as `{label, description}`, a zero-based `recommended` index, and an explicit `multi` boolean. Set `multi: true` only when several answers can genuinely hold together. Do not supply "Other": Trama adds it.
- A result with `status: "answered"` contains `answers` keyed by question id. An answered entry has the original `selected` labels and optional free-form `text`; a `status: "skipped"` entry is an explicit developer skip. Use the recommendation for that skipped decision, report it as an assumption for review, and do not ask it again.
- An `invalid-input` error means the request was refused before opening a round: correct the identified field and submit the corrected request.
- An **`editor-interrupted` error stops this workflow immediately**. Do not use partial answers or recommendations, fall back, retry, reroute, resume the round, or create or submit a Proposal from its unanswered decisions. Report that the editor was lost.
- Only an initial `status: "unavailable"` result permits the agent-specific fallback below. Prefer its question tool; use text only if that tool is absent.

- **omp:** the `ask` tool. One entry in `questions` per decision: a short `id`, the `question`, `options` as `{label, description}` with the tradeoff in `description`, and `recommended` set to the index of your recommended option. Set `multi: true` only when several answers can genuinely hold together. Do not add an "Other" option: omp adds one.
- **VS Code agent (Copilot):** the `vscode_askQuestions` tool ("Ask Clarifying Questions", `#tool:vscode/askQuestions` in prompts). One entry in `questions` per decision: a unique `header` of at most 50 characters, a `question` of at most 200 characters, `options` as `{label, description}` with the tradeoff in `description`, and `recommended: true` on your recommended option. Set `multiSelect: true` only when several answers can hold together. Leave free-form answers allowed.
- **No question tool** (another agent, or a non-interactive run): write the round as a numbered list. Each question has its options as `a)`, `b)`, … with their tradeoffs, then a line `➡️ <your recommendation and why>`. End the message there.

## When a Proposal comes back

If the developer rejected it, the reason, when they gave one, is under `## Feedback` in `trama proposal show <id>`. Do not patch the rejected Proposal: open a **new** one that addresses the feedback. A stale Proposal (the Model changed under it) is also replaced by a new one.

### Reworking the stale Proposal of a Drift

When the prompt says that Proposal `<p>`, attached to Drift `<d>`, is stale, do not interview the developer. Write a new Proposal that makes the same change on the current Model and Requirements (read `trama proposal show <p>` for what it did; list your choices in the new Proposal body), validate it and submit it as usual. Only after the submission succeeds run `trama drift replace-proposal <d> --proposal <new id>` (or `trama_drift_replace_proposal`): it attaches the new Proposal to the Drift and rejects the stale one as replaced. Run it once. If it is refused, report why and stop.

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
