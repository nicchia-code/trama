---
name: trama-design
description: Use when the user wants to add, change or think through behaviour of a project that has a `.trama/` folder, or how it must be built (interface, technology, quality, data, business rules): new feature, new state, edge cases, "what happens when…", "the screen should look…". Turns the conversation into a Trama Proposal for the Model and its Requirements. Not for writing code.
---

# Trama: design

The **Model** in `.trama/model/` is the source of truth for how the System behaves. Next to it, the **Requirements** in `.trama/requirements/` say how it must be built: one folder per **Area** (by default `ui`, `tech`, `quality`, `data`, `rules`), with an `area.md` and **fragments** that hold its sections. You change both only through a **Proposal** that the developer approves as a whole. You never write code in this skill.

## Hand-over

A new Proposal starts as a **Draft**, not approvable. Finish every file, then run `trama proposal submit <id>` without `validate --proposal` or `proposal show` before it: read the changes in the submission's output. If they do not match what you meant, reopen the Proposal with `trama proposal edit <id>`, fix the files, and submit again. If submission is refused, fix the reported problems and submit again. Only after it succeeds tell the developer to review it. Before every later file change, call `trama proposal edit` again: it returns an open Proposal to Draft, so submit again when finished.

## Announcing cards

When the developer asked for a design from Trama's terminal, Trama has already announced the first Proposal on the Board, so you do not announce it. When you write more Proposals after the first (a large change split into Proposals that build on each other), announce each one as soon as you know you will write it: `trama announce proposal "<title>"` prints an announcement ID. Pass it when you open that Proposal: `trama proposal new … --announcement <id>`. The Board shows a ghost of the card meanwhile. Never wait for the ghost to show and never skip or delay a card because of it; an unknown ID is only noted in the output.

## Hard rules

- NEVER edit `.trama/model/` or `.trama/requirements/` directly, nor the generated `trama-req-*` skills. Every change goes through a Proposal, created with `trama proposal new`.
- Agents may approve or reject a Proposal, discard a Draft or resolve a Drift only when the developer explicitly asks for that decision in the conversation. Without that request, do not decide and do not ask the developer about it: stop and tell them the decision is theirs, on the Board. After handing over a finished Proposal, stop and ask the developer to review it; an explicit design request does not by itself authorize approving, rejecting or discarding it.
- The Model describes *what can happen*, never *how it is built*: no variables, field names, database columns, endpoints, classes or file paths. A State is a situation in domain words ("Awaiting payment"), not a combination of values. How it is built (layout, styling, libraries, limits, data fields, formulas) belongs in the Requirements.
- Conditions and consequences of a Transition are plain prose after the colon.

## Naming cards

Every live Proposal, Task and Drift has a temporary **short number** (`P3`, `T3`, `D3`) besides its **permanent identity** of eight characters.

- Name cards to the developer by short number and title, for example "Proposal P3 – title". A closed card has no number: use its permanent identity.
- In every command you run and every file you write (the Proposal body, `--requires`, `--request`, reasons, references) use **only the permanent identity**, taken from `--json` (field `id`; the number is the field `number`) or from the file or folder name. **Never write a short number in a file**: it changes from one working copy to another.
- Give every card you create, and its announcement, a **short title**: at most five words, about 40 characters, a name for the card rather than a sentence describing the work (for example "Testo fantasma" instead of "Descrivere Start from Scratch e guidare le richieste scritte con un testo fantasma"). Put the detail in the body, even when the title loses information. No command checks the length of a title. Titles that Trama or a skill composes from another title stay as they are: `Fix code to match the …`, `Import: <Feature>`, the titles of checks.

## Language

When the instruction asks you to write in a language, everything you generate for Trama that the developer reads goes in that language: the bodies, descriptions and introductions of Proposals, Model files, Requirements, Tasks and Drifts; the titles of Proposals, Tasks, Drifts, Areas and Requirement fragments, and of announcements; the names of the System, Features, Machines, Actors and States; new identifiers (IDs of Features, Machines and Actors, Event names), transliterated into the allowed ASCII letters (`città` → `citta`, an Event `PAGAMENTO_RIUSCITO`); the text of questions and their options, and your replies in the conversation. Without a language in the instruction, nothing here changes.

- **Always in English**, whatever the language: technical terms are never translated: commands and tools (`git pull`, `npm install`), names of products, services, libraries and languages, and Trama's own terms (Proposal, Task, Drift, Board, Run, Scan). Also always English: code and its comments, commit messages, the project's own documentation; the headers Trama reads in files ("States", "Events", "General", "What happens", "What should happen", "Where in the code", "Fix options", "Already present"), the `(initial)` and `(final)` markers, the keys of Specs and the front matter fields. Trama's interface (panel, editor, command line) stays in English.
- **A language changes nothing already written.** When you edit a file written in another language, keep its existing text and write only the new or rewritten text in the chosen language; never translate the whole file.

## Steps

1. **Explore before asking.** When the instruction names a written design request, read it first (see "Written design requests" below). Then `trama system`, then `trama search <word>` for what already exists (it searches the Requirements too), then `trama feature <id>`, `trama machine <id>`, `trama state <machine/State>`, `trama event <owner.EVENT>`, and `trama requirements` for the Areas. Reuse existing Machines, Actors and Events instead of duplicating them. Add `--json` if you need structured data. Facts are your job: never ask the developer anything the Model, the Requirements or the code can tell you.
   **With sub-agents**, before the first round, hand this exploration to them, at most N at once, where N is the limit in Trama's instruction (`20` if it gives none), in whatever way your agent starts sub-agents: give each one part of the request (the Machines and Features it involves, and the code that implements them), with the commands above and the instruction to come back with a short account of what exists, what the request would change there and what is unclear. A sub-agent asks the developer nothing and writes no Proposal. Gather their accounts; you alone run the remaining exploration, interview the developer and write the Proposal.
2. **Interview the developer in rounds** until every decision about the change is settled (see "The interview" below). Do not open a Proposal before that, and once the last round is answered open it straight away: do not ask the developer to confirm a summary first.
3. **Open a Proposal** for one coherent change, which may touch several Machines, Features and Areas: `trama proposal new "<title>" --body "<why>"`. The body says why and summarises the decisions taken in the interview, one line each, with the assumptions you made for skipped questions. When the change is too large to review at once, split it into Proposals that build on each other: open the later ones with `--requires <id>` of the earlier ones; each is then written and validated on top of them and can only be approved after them. For a written design request, bind only the first Proposal to it with `--request <id>`.
   Give the Proposal a short title (see Naming cards).
4. **Edit files through it.** When the change alters the project's technologies, also write the Specs: `trama proposal edit <id> specs.yaml` (see [FORMAT.md](./FORMAT.md)), giving `chosenByAgent` for each technology you picked yourself. For each Model file: `trama proposal edit <id> <model-path>` (for example `checkout/order.md`) prints the path to edit. For an Area: `trama proposal edit <id> requirements/<area>/area.md` for its description, title and introduction, and `trama proposal edit <id> requirements/<area>/<fragment>.md` for a fragment, new or existing. An existing file arrives pre-filled; a new file arrives empty. To remove a file: `trama proposal delete <id> <path>`. Write files as described in [FORMAT.md](./FORMAT.md). Always write the **complete** new version of a file. Put the Requirements the developer gave you in the same Proposal as the behaviour they belong to.
5. **Write the Tasks.** Only for an ordinary Proposal (`kind: change`) that is not attached to a Drift: an import, a resolution, or a Proposal written to answer a Drift has none. Take the scope from `trama proposal show <id>` (its `## Scope`) and split it by Machine, so that no reference has two Tasks. Entries that belong to no Machine (General sections, Feature descriptions, Actor Events, whole Areas) stay with you.
   - Whatever exploration already saw implemented is not a Task: write it in the `## Already present` section of the Proposal body, one line per element, as ``- `<ref>` — <where in the code>``.
   - **With sub-agents**, give each Machine group to one sub-agent, at most N at once, as in step 1. Each writes the Tasks of its own references and nothing else, asks the developer nothing, never runs `trama proposal submit`, and comes back with the names of the files it wrote. Without sub-agents, do the groups one after the other.
   - Write each Task with `trama proposal edit <id> tasks/<slug>.md`: it prints the full path, with the permanent identity assigned there. To rewrite a Task, pass the full name it printed. Front matter has only `technical` (`false` by default; `true` for a Technical Task, which names no Model element) and `refs` (element references and Requirement sections, as in `--ref`); then an H1 with the title and a prose body saying what must hold when the Task is done, with each condition and consequence as the Model states it. A non-technical Task names at least one Model element; every reference must exist once the Proposal is applied.
   - Give each Task a short title (see Naming cards).
   - A changed Specs field is a scope entry `specs#<field>`: cover it by a Task that names it in `refs`, as for any Requirement section.
   - Every scope entry must be covered: by a Task whose reference equals it or contains it (a Task on `task` covers `task/To do`), or by an `## Already present` line. A `requirements/<area>#<section>` entry is covered by a Task that names that section or its Area.
   - Do not show the Proposal before submitting it: the submission's output prints its Tasks and scope, and step 6 reads them.
6. **Hand over.** Run `trama proposal submit <id>` without `trama validate --proposal` or `trama proposal show` before it. Its checks report every uncovered scope entry and every Task that names a missing element; fix the Tasks or the `## Already present` lines. A Requirement section titled with a State you removed or renamed is an error: update or remove that section in the same Proposal. Its warnings do not block, but act on them: a fragment over 12 KB that the Proposal writes into is split in the same Proposal (see "Good Requirement habits"); a switch of the Requirement skills between fragment and index mode goes into your hand-over summary. If the submission is refused, or its output does not match what was agreed, reopen the Proposal with `trama proposal edit <id>`, fix the files, and submit again.
7. **Light code scan after submission.** Take the scope of the Proposal from the submission's output and read in the code only the entries that exploration did not already read; do not reread the rest, nor the `## Already present` lines. With sub-agents, split those entries among them, at most N at once, as in step 1; they come back with a short account and write nothing. A contradiction between the code and the Model or the Requirements is never a Drift: ask the developer a new round of questions about it (see "The interview"), reopen the Proposal with `trama proposal edit`, keep it a Draft, update the Proposal and its Tasks with the answers, submit again, and light-scan only the new entries. The scan never files a Drift, is not announced as a check, and is not part of the autopilot barrier. After submission succeeds, summarise the Proposal in a few lines, tell the developer to review it on the board or with `trama proposal show <id>`, and stop.

## The interview

Treat the change as a tree of decisions: each answer opens the decisions that hang off it. Work it in rounds.

- **One round = every open decision whose prerequisites are settled.** Ask them all at once, not one per message. A question whose meaning depends on another answer of the same round ("if you pick 1b…") belongs to a later round: leave it out.
- **Every question offers 2 to 5 concrete, materially different options**, each with its tradeoff in a few words, and **your recommendation**. Put the whole round in **one** call of `trama ask` (see "Asking" below), then stop and wait for the answers.
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
- **Wait for `trama ask` to finish**: it blocks until the developer answers. Run it with the default wait. If Cursor moves it to the background, wait only for the end of that command with Cursor's background-wait tool (`AwaitShell` on the command's id), which returns as soon as the command ends, then read its result at once. If that wait times out before the command ends, because the developer is still answering, wait again on the same command. Never use a timer or a fixed-duration wait, `sleep`, periodic reads of the terminal output or interval checks; never end the turn to be woken up; never treat `trama ask` as failed and never run it again.
- In Cursor's sandbox (`CURSOR_SANDBOX` is set), an initial `status: "unavailable"` may only mean the sandbox hides the editor: run the same `trama ask` once more outside the sandbox, asking Cursor for permission, and treat that result as the real one.
- Only an initial `status: "unavailable"` result means the editor is unavailable. Then you ask in no other way: you stop, open no Proposal, and tell the developer to open the project in the editor with Trama. When the developer says to continue, run the same `trama ask` again: it is a new round.
- A usage error of `trama ask` (exit code 2, wrong arguments, unrecognised command) or an input error is **never** editor unavailability: correct the call and repeat it. A deliberate skip is not re-asked.

- Never use your own question tool (`ask` in omp, `AskQuestion` in Cursor, `vscode_askQuestions` in VS Code, `AskUserQuestion` in Claude Code), and never write the questions in the conversation: `trama ask` is the only way to ask the developer.

## Written design requests

When the instruction names a file `.trama/requests/<id>.md`, the developer wrote the change down before asking.

- Read the **whole** file before exploring the Model. If it no longer exists, tell the developer that the request is gone and stop, without opening any Proposal.
- The request is the starting point of the interview, never its answers. The interview stays complete: every decision the request makes still becomes a question with its options, and the option the request indicates is your recommendation. Whatever it leaves open you ask about as usual.
- Look at every image the request links: local files, relative to the request file or to the project, and web addresses, when you can open them. An image you cannot see (missing file, unreachable address, a model that does not read images) you ignore silently, without telling the developer. Put in words what matters in the images you can see, and never copy, link or cite the request's images, or their paths, in the Proposal body, the Model, the Requirements, the Specs or the Tasks.
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
