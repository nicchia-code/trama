---
name: trama-design
description: Use when the user wants to add, change or think through behaviour of a project that has a `.trama/` folder, or how it must be built (interface, technology, quality, data, business rules): new feature, new state, edge cases, "what happens when…", "the screen should look…". Turns the conversation into a Trama Proposal for the Model and its Requirements. Not for writing code.
---

# Trama: design

The **Model** in `.trama/model/` is the source of truth for how the System behaves. Next to it, the **Requirements** in `.trama/requirements/` say how it must be built: one folder per **Area** (by default `ui`, `tech`, `quality`, `data`, `rules`), with an `area.md` and **fragments** that hold its sections. You change both only through a **Proposal** that the developer approves as a whole. You never write code in this skill.

## Hand-over

A new Proposal starts as a **Draft**, not approvable. Finish every file, validate and read the changes before `trama proposal submit <id>`. If submission is refused, fix the reported problems, validate and review again, then retry. Only after it succeeds tell the developer to review it. Before every later file change, call `trama proposal edit` again: it returns an open Proposal to Draft, so submit again when finished.

## Announcing cards

When the developer asked for a design from Trama's terminal, Trama has already announced the first Proposal on the Board, so you do not announce it. When you write more Proposals after the first (a large change split into Proposals that build on each other), announce each one as soon as you know you will write it: `trama announce proposal "<title>"` prints an announcement ID. Pass it when you open that Proposal: `trama proposal new … --announcement <id>`. The Board shows a ghost of the card meanwhile. Never wait for the ghost to show and never skip or delay a card because of it; an unknown ID is only noted in the output.

## Hard rules

- NEVER edit `.trama/model/` or `.trama/requirements/` directly, nor the generated `trama-req-*` skills. Every change goes through a Proposal, created with `trama proposal new`.
- Agenti possono approvare o rifiutare una Proposal, scartare una Draft o risolvere un Drift solo se il developer chiede esplicitamente quella decisione nella conversazione. Senza la richiesta, fermati e chiedi al developer di decidere. Dopo aver consegnato una Proposal finita, fermati e chiedi al developer di esaminarla; una richiesta esplicita di progettazione non autorizza da sola ad approvarla, rifiutarla o scartarla.
- The Model describes *what can happen*, never *how it is built*: no variables, field names, database columns, endpoints, classes or file paths. A State is a situation in domain words ("Awaiting payment"), not a combination of values. How it is built (layout, styling, libraries, limits, data fields, formulas) belongs in the Requirements.
- Conditions and consequences of a Transition are plain prose after the colon.

## Naming cards

Every live Proposal, Task and Drift has a temporary **short number** (`P3`, `T3`, `D3`) besides its **permanent identity** of eight characters.

- Name cards to the developer by short number and title, for example "Proposal P3 – title". A closed card has no number: use its permanent identity.
- In every command you run and every file you write (the Proposal body, `--requires`, `--request`, reasons, references) use **only the permanent identity**, taken from `--json` (field `id`; the number is the field `number`) or from the file or folder name. **Never write a short number in a file**: it changes from one working copy to another.

## Language

When the instruction asks you to write in a language, only the prose you produce for Trama goes in that language: the bodies, descriptions and introductions of Proposals, Model files, Requirements, Tasks and Drifts, the text of questions and their options, and your replies in the conversation. Without a language in the instruction, nothing here changes.

- **Always in English**, whatever the language: code and its comments, commit messages and the project's own documentation; the names and titles of Model elements, Requirements, Proposals, Tasks and Drifts; IDs, Event names, the section titles Trama requires (for example "General", "What happens", "What should happen", "Where in the code") and the `(initial)` and `(final)` markers.
- **A language changes nothing already written.** When you edit a file written in another language, keep its existing text and write only the new or rewritten text in the chosen language; never translate the whole file.

## Steps

1. **Explore before asking.** When the instruction names a written design request, read it first (see "Written design requests" below). Then `trama system`, then `trama search <word>` for what already exists (it searches the Requirements too), then `trama feature <id>`, `trama machine <id>`, `trama state <machine/State>`, `trama event <owner.EVENT>`, and `trama requirements` for the Areas. Reuse existing Machines, Actors and Events instead of duplicating them. Add `--json` if you need structured data. Facts are your job: never ask the developer anything the Model, the Requirements or the code can tell you.
   **With sub-agents**, before the first round, hand this exploration to them, at most N at once, where N is the limit in Trama's instruction (`20` if it gives none), in whatever way your agent starts sub-agents: give each one part of the request (the Machines and Features it involves, and the code that implements them), with the commands above and the instruction to come back with a short account of what exists, what the request would change there and what is unclear. A sub-agent asks the developer nothing and writes no Proposal. Gather their accounts; you alone run the remaining exploration, interview the developer and write the Proposal.
2. **Interview the developer in rounds** until every decision about the change is settled (see "The interview" below). Do not open a Proposal before that, and once the last round is answered open it straight away: do not ask the developer to confirm a summary first.
3. **Open a Proposal** for one coherent change, which may touch several Machines, Features and Areas: `trama proposal new "<title>" --body "<why>"`. The body says why and summarises the decisions taken in the interview, one line each, with the assumptions you made for skipped questions. When the change is too large to review at once, split it into Proposals that build on each other: open the later ones with `--requires <id>` of the earlier ones; each is then written and validated on top of them and can only be approved after them. For a written design request, bind only the first Proposal to it with `--request <id>`.
4. **Edit files through it.** For each Model file: `trama proposal edit <id> <model-path>` (for example `checkout/order.md`) prints the path to edit. For an Area: `trama proposal edit <id> requirements/<area>/area.md` for its description, title and introduction, and `trama proposal edit <id> requirements/<area>/<fragment>.md` for a fragment, new or existing. An existing file arrives pre-filled; a new file arrives empty. To remove a file: `trama proposal delete <id> <path>`. Write files as described in [FORMAT.md](./FORMAT.md). Always write the **complete** new version of a file. Put the Requirements the developer gave you in the same Proposal as the behaviour they belong to.
5. **Validate until clean.** `trama validate --proposal <id>` must report no errors. A Requirement section titled with a State you removed or renamed is an error: update or remove that section in the same Proposal. Its warnings do not block, but act on them: a fragment over 12 KB that the Proposal writes into is split in the same Proposal (see "Good Requirement habits"); a switch of the Requirement skills between fragment and index mode goes into your hand-over summary. Then `trama proposal show <id>` and read the changes: they must match what was agreed, and nothing else.
6. **Hand over.** Run `trama proposal submit <id>` only after step 5. If refused, correct its problems and repeat validation and review before retrying. After submission succeeds, summarise the Proposal in a few lines, tell the developer to review it on the board or with `trama proposal show <id>`, and stop.

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

Run **`trama ask --root <project>`** with the JSON request on stdin, for every round of questions.

- Send one complete round as `{questions: [...]}`. Every question has a unique non-empty `id`, `question`, `options` as `{label, description}`, a zero-based `recommended` index, and an explicit `multi` boolean. Two fields are optional: `context` on a question and `details` on an option; when present they must not be blank.
- Keep `question` short: one sentence that reads on its own. Put the background of the decision in `context`, the tradeoff in a few words in `description`, and a longer explanation, only when it is needed, in `details`. `question`, `context`, `description` and `details` are Markdown; labels are plain text. Set `multi: true` only when several answers can genuinely hold together. Do not supply "Other": Trama always offers a free-text answer.
- A result with `status: "answered"` contains `answers` keyed by question id. An answered entry has the original `selected` labels and optional free-form `text`; a `status: "skipped"` entry is an explicit developer skip. Use the recommendation for that skipped decision, report it as an assumption for review, and do not ask it again.
- An `invalid-input` error means the request was refused before opening a round: correct the identified field and submit the corrected request.
- An **`editor-interrupted` error stops this workflow immediately**. Do not use partial answers or recommendations, fall back, retry, reroute, resume the round, or create or submit a Proposal from its unanswered decisions. Report that the editor was lost.
- **Wait for `trama ask` to finish**: it blocks until the developer answers. If Cursor moves it to the background after 30 seconds, keep waiting for its result; it has not failed, so run it only once.
- In Cursor's sandbox (`CURSOR_SANDBOX` is set), an initial `status: "unavailable"` may only mean the sandbox hides the editor: run the same `trama ask` once more outside the sandbox, asking Cursor for permission, and treat that result as the real one.
- Only an initial `status: "unavailable"` result permits the agent-specific fallback below. Prefer its question tool; use text only if that tool is absent.
- A usage error of `trama ask` (exit code 2, wrong arguments, unrecognised command) or an input error is **never** editor unavailability: correct the call and repeat it. Never answer it by switching to the agent's own question tool or a round written in the conversation. A deliberate skip is not re-asked through the fallback either.

- **omp:** the `ask` tool. One entry in `questions` per decision: a short `id`, the `question`, `options` as `{label, description}` with the tradeoff in `description`, and `recommended` set to the index of your recommended option. Set `multi: true` only when several answers can genuinely hold together. Do not add an "Other" option: omp adds one.
- **VS Code agent (Copilot):** the `vscode_askQuestions` tool ("Ask Clarifying Questions", `#tool:vscode/askQuestions` in prompts). One entry in `questions` per decision: a unique `header` of at most 50 characters, a `question` of at most 200 characters, `options` as `{label, description}` with the tradeoff in `description`, and `recommended: true` on your recommended option. Set `multiSelect: true` only when several answers can hold together. Leave free-form answers allowed.
- **No question tool** (another agent, or a non-interactive run): write the round as a numbered list. Each question has its options as `a)`, `b)`, … with their tradeoffs, then a line `➡️ <your recommendation and why>`. End the message there.

## Written design requests

When the instruction names a file `.trama/requests/<id>.md`, the developer wrote the change down before asking.

- Read the **whole** file before exploring the Model. If it no longer exists, tell the developer that the request is gone and stop, without opening any Proposal.
- The request is the starting point of the interview, never its answers. The interview stays complete: every decision the request makes still becomes a question with its options, and the option the request indicates is your recommendation. Whatever it leaves open you ask about as usual.
- Bind the first Proposal of the design to it: `trama proposal new "<title>" --body "<why>" --request <id>`. The Proposals that follow it with `--requires` get no `--request`. Handing the bound Proposal over deletes the request file, as intended.

## When a Proposal comes back

If the developer rejected it, the reason, when they gave one, is under `## Feedback` in `trama proposal show <id>`. Do not patch the rejected Proposal: open a **new** one that addresses the feedback. A stale Proposal (the Model changed under it) is also replaced by a new one.

## Good Model habits

- One Machine per kind of thing (Order, Payment, Cart), not per screen step. UI behaviour gets its own Machine when it has its own States (for example a checkout form), and talks to the domain only through Events.
- Name Events as facts that happened (`PAYMENT_SUCCEEDED`), owned by whoever emits them. Something outside the System (user, payment provider, time) is an Actor and only emits.
- Use sub-States to zoom in (`Paid` contains `Preparing` and `Ready to ship`), not to model parallelism; parallel things are separate Machines.
- Every Machine has exactly one `(initial)` State per level. End states are `(final)` and have no outgoing Transitions.
- After the Proposal is approved, `trama analyze` shows unreachable States, dead ends and Events nobody receives. Fix those through another Proposal if they are real.

## Good Requirement habits

- An Area is a folder `requirements/<area>/`. Its `area.md` holds a `description` saying when an agent needs the Area, the title and, optionally, prose for the whole Area; no sections. The sections live in **fragments**, `requirements/<area>/<fragment>.md`, each with its own `description` saying when an agent needs that fragment, its title, and only sections. Keep descriptions about the kind of work ("Use when building or changing the checkout screens…").
- `## General` holds what applies everywhere in the Area, in whichever fragment it sits. Any other `##` section is titled with a Model reference (`checkout`, `order`, `order/Paid`, `user.CANCEL`) and applies to that element and everything inside it. A section appears once in its Area.
- Trama turns every fragment with content into a `trama-req-<area>-<fragment>` skill while the names and descriptions of those skills fit in 4,000 characters; beyond that, every Area becomes one index skill `trama-req-<area>` that lists its fragments. Short descriptions keep the project in the first mode.
- **Split a fragment that is or becomes larger than 12 KB** when your Proposal writes into it, in the same Proposal, before handing it over. Cut where it suits the project, usually by Feature or by a group of nearby Machines; give every new fragment a name and a description that say when it is needed; move the sections without changing their text. Prefer a few medium fragments to many tiny ones: every fragment adds a skill to the 4,000-character budget.
- Screens and navigation are behaviour: model them as a UI Machine whose States are screens or visual states, and attach their look (layout, components, texts) as `ui` Requirements on those States.
- Write Requirements as short, checkable statements ("Amounts show two decimals and the currency symbol"), not wishes ("nice formatting").
- Data fields and formulas go in `data` and `rules`, attached to the Machine or State they concern, never in the Model.
- A new Area is a new folder `requirements/<area>/` with a kebab-case name, an `area.md` and at least one fragment, for example to split `ui` into `ui-web` and `ui-mobile`.

## PowerShell

The examples use POSIX syntax. In PowerShell, pass JSON on standard input with a pipe, for example `Get-Content -Raw round.json | trama ask --root <project>`, not `<`. On Windows PowerShell 5.1, set `$OutputEncoding` and `[Console]::OutputEncoding` to UTF-8 first, or non-ASCII characters arrive as `?`. Write `--body` and `--reason` values in single quotes, because PowerShell expands `$` and the backtick inside double quotes.
