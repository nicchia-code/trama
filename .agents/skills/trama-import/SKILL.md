---
name: trama-import
description: Use when asked to import, reverse-engineer or describe existing code as a Trama Model, in a project with a `.trama/` folder whose Model is empty or covers only part of the code. Reads the code and writes Proposals for the Model and its evident Requirements, describing the code as it is. Does not change code.
---

# Trama: import

You describe the **existing code** as a Trama **Model** (what the System does) plus its evident **Requirements** (how it is built), written as **Proposals** the developer approves. The Model you write describes the code **as it is**, bugs included; everything that looks wrong or that the documentation contradicts goes into the Proposal as a **doubt** for the developer, never silently "fixed".

## Hand-over

A new Proposal starts as a **Draft**, not approvable. Finish every file, then run `trama proposal submit <id>` without `validate --proposal` or `proposal show` before it: read the changes in the submission's output. If they do not match what you meant, reopen the Proposal with `trama proposal edit <id>`, fix the files, and submit again. If submission is refused, fix the reported problems and submit again. Only after it succeeds tell the developer to review it. Before every later file change, call `trama proposal edit` again: it returns an open Proposal to Draft, so submit again when finished.

## Announcing cards

Once you have planned the Model (step 4), announce every Proposal you will write, each as soon as you know its title: `trama announce proposal "<title>"` prints an announcement ID. Pass it when you open that Proposal: `trama proposal new … --import --announcement <id>`. The Board shows a ghost of each Proposal meanwhile. Never wait for a ghost to show and never skip or delay a Proposal because of it; an unknown ID is only noted in the output.

Announce every Drift you will file the same way, before you file it: `trama announce drift "<title>"` prints an announcement ID, and `trama drift new … --announcement <id>` takes it. Never wait for its ghost to show.

## Hard rules

- NEVER edit code, `.trama/model/` or `.trama/requirements/` directly. Everything goes through Proposals opened with `--import`.
- Agents may approve or reject a Proposal, discard a Draft or resolve a Drift only when the developer explicitly asks for that decision in the conversation. Without that request, do not decide and do not ask the developer about it: stop and tell them the decision is theirs, on the Board. An import or design request does not by itself authorize these decisions.
- **The code wins.** Model what the code does. Where the documentation (README, `docs/`, comments, API descriptions) says something else, model the code and file a Drift for that difference, as described in "Drifts for documentation differences". Where the code looks buggy or misses a case that the documentation does not mention, model it as it is and record a doubt.
- **Never change what is already modelled.** If the Model already has Machines, do not edit their files. You may add new Features, Machines, Actors, Events of existing Actors and Requirement sections. If the code contradicts an existing Machine, do not fix it: list it in your report and suggest a Scan of that Feature.
- The Model has no code words: no variable, field, function, class, table, endpoint or file names in States, Transitions or Events. Write conditions and consequences in domain words. Code locations belong only in the doubts and in the `--where` of a Drift.
- Import only **evident and stable** Requirements: `tech` (language, framework, main libraries, platform, as declared in manifests and configuration), `data` (main entities and their fields, from schemas or models), `rules` (formulas, limits and policies written explicitly in the code). Never `ui` or `quality`: the code does not tell what was intended there.

## Naming cards

Every live Proposal and Drift has a temporary **short number** (`P3`, `D2`) besides its **permanent identity** of eight characters.

- Name Proposals and Drifts to the developer by short number and title, for example "Proposal P3 – Import: title" or "Drift D2 – title", also in the final report. A closed card has no number: use its permanent identity.
- In every command you run and every file you write (`--requires`, the Proposal bodies, the doubts) use **only the permanent identity**, taken from `--json` (field `id`; the number is the field `number`) or from the file or folder name. **Never write a short number in a file**: it changes from one working copy to another.
- Give every card you create, and its announcement, a **short title**: at most five words, about 40 characters, a name for the card rather than a sentence describing the work (for example "Testo fantasma" instead of "Descrivere Start from Scratch e guidare le richieste scritte con un testo fantasma"). Put the detail in the body, even when the title loses information. No command checks the length of a title. Titles that Trama or a skill composes from another title stay as they are: `Fix code to match the …`, `Import: <Feature>`, the titles of checks.

## Language

When the instruction asks you to write in a language, everything you generate for Trama that the developer reads goes in that language: the bodies, descriptions and introductions of Proposals, Model files, Requirements, Tasks and Drifts; the titles of Proposals, Tasks, Drifts, Areas and Requirement fragments, and of announcements; the names of the System, Features, Machines, Actors and States; new identifiers (IDs of Features, Machines and Actors, Event names), transliterated into the allowed ASCII letters (`città` → `citta`, an Event `PAGAMENTO_RIUSCITO`); the text of questions and their options, and your replies in the conversation. Without a language in the instruction, nothing here changes.

- **Always in English**, whatever the language: technical terms are never translated: commands and tools (`git pull`, `npm install`), names of products, services, libraries and languages, and Trama's own terms (Proposal, Task, Drift, Board, Run, Scan). Also always English: code and its comments, commit messages, the project's own documentation; the headers Trama reads in files ("States", "Events", "General", "What happens", "What should happen", "Where in the code", "Fix options", "Already present"), the `(initial)` and `(final)` markers, the keys of Specs and the front matter fields. Trama's interface (panel, editor, command line) stays in English.
- **A language changes nothing already written.** When you edit a file written in another language, keep its existing text and write only the new or rewritten text in the chosen language; never translate the whole file.

## Steps

1. **Read what is modelled.** `trama system`, `trama requirements`, and `trama feature <id>` for each existing Feature. Note what is already covered.
2. **Survey the code yourself.** Manifests and configuration, entry points, routes and handlers, status fields and enums, workflows, jobs and timers, webhooks and integrations, screens and navigation, schemas, tests (they often state the intended behaviour), and the documentation.
3. **Ask one round of questions, then work alone.** In one call of `trama ask` (see "Asking" below) ask what you cannot find out yourself: which folders to import and which to ignore, and how to split the System into Features (offer your own split as the recommended option, plus one or two alternatives). Add any other question whose answer changes the whole import. After the answers, do not ask again: record the remaining uncertainty as doubts.
4. **Plan the Model.** One Machine per kind of thing with a lifecycle (an order, a payment, a subscription, a document), its States taken from the code's status values and the situations its handlers distinguish, its Transitions from the code paths that move between them, and the guards and side effects as prose. Who triggers what from outside (people, other systems, webhooks, time) are Actors that emit Events. Screens and navigation become a UI Machine only when the app has real navigation flows. Follow the format in [FORMAT.md](../trama-design/FORMAT.md).
5. **First Proposal: the System and its Actors.** `trama proposal new "Import: System and Actors" --import --body "<what was imported and from where>"`. Write `system.md` (only if it still has placeholder text or does not exist), every new Actor with the Events it emits, and the General sections of `tech` and `data`. Requirements live in Area folders: `area.md` for the Area's description and title, fragments `requirements/<area>/<fragment>.md` for the sections (see "Requirements" in [FORMAT.md](../trama-design/FORMAT.md)). On a partly modelled project, skip this Proposal if nothing is new.
6. **One Proposal per Feature.** `trama proposal new "Import: <Feature>" --import --requires <first Proposal ID> [--requires <ID of another Feature's Proposal whose Events this one reacts to>]`. Write `<feature>/feature.md`, its Machines, and the `data` and `rules` sections attached to them (`## order`, `## order/Paid`), in a fragment of the Area that suits that Feature, usually one fragment per Feature with a description saying when it is needed. Each Proposal is written and validated on top of the ones it requires, so only list Proposals you actually build on.
7. **Record the differences.** File one Drift for each difference between the documentation and the code, as described in "Drifts for documentation differences". Then end the body of each Proposal (`--body`, or edit `proposal.md`) with a `## Doubts` section, one line each:
   - code that looks like a bug, a missing case or dead code, with its location, where the documentation does not say otherwise;
   - behaviour you could not determine.
   Write "None." if there are none. Documentation differences are Drifts, never doubts.
   Give each Drift a short title (see Naming cards).
8. **Hand every Proposal over.** Run `trama proposal submit <id>` for each, without `trama validate --proposal` or `trama proposal show` before it: its checks report the problems and its output prints the changes, which must describe the code and nothing else. When it warns of a fragment larger than 12 KB that the Proposal writes into, split that fragment in the same Proposal and submit again: cut by Feature or by a group of nearby Machines, give every new fragment a name and a description that say when it is needed, move the sections without changing their text, and prefer a few medium fragments to many tiny ones (every fragment counts against the 4,000-character budget of the Requirement skills). A dependency need not be approved for submission. If a submission is refused or its output does not match, reopen the Proposal with `trama proposal edit <id>`, correct it, and submit again before continuing.
9. **Report and stop.** After every submission succeeds, list the Proposals in the order to approve them, with how many doubts each has, the Drifts you filed (each named by short number and title), the differences you could not file yet, the folders you skipped, and any contradiction with Machines that were already modelled (suggest a Scan for those Features). Approving an import Proposal starts no Scan: the Model already matches the code.

## Drifts for documentation differences

A difference between the documentation and the code is a **Drift**, not a doubt: the developer decides, for each one, whether the code or the documentation is right. File it once with `trama drift new`, without `--task`, and with `--proposal` only in the case below: no Proposal fixes it and no Task implements it otherwise.

- Before filing, run `trama drift list --all --ref <ref>` for each element or Requirement it concerns: a difference that a resolved Drift closed stays closed while the Model or the Requirement there still says the same thing, so do not file it again. A Drift dismissed by its fix Task closed without changes does not count as closed: file it again if the code really diverges now. If it is back after a fix of the code or an adaptation of the Model, pass `--previous <id>` of that resolved Drift; the command refuses a previous Drift that is open, dismissed or unknown.
- `--ref` names an element or a Requirement section that already exists in the Model or the Requirements, because `trama drift new` refuses a reference that does not resolve. Name the nearest one that does, for example the Area's section for a stated rule. If the difference is about an element this import is still to create, record it as a doubt in its Proposal and list it in the report.
- **No fix respects both.** When no fix of the code respects the Model and the Requirements together (for example, two Requirements contradict each other), file the Drift with no `--option` and with `--proposal` of a Draft that repairs the Model or the Requirements: a design Proposal, `trama proposal new` without `--import`, written as `trama-scan` describes under "Drift without Fix options, with a Proposal". A Drift without Fix options is refused without a Proposal.
- The command: `trama drift new "<title>" --ref <ref> --happens "<what the code does>" --should "<what the documentation says and why it differs>" --option "<title of the way you recommend>" --option-text "<what it changes and costs>" --option "<title of another way>" --option-text "<…>" [up to five] --where "<where in the code>" --announcement <id>`. Re-read the code at the `--where` place first, and file only if it really does what `--happens` says. The two texts, `--where` and two to five options, the recommended one first with different titles, are required, except in the no-fix case above (there `--where` is still required, and no option is passed).
- Write both sides and the options at the level of behaviour: what the System does and what the documentation promises, in the words of the domain, not how the code does it. Name no variable, function, class, field or file unless the difference cannot be understood without it. Code locations go only in `--where`, the files and no line numbers. Use short Markdown: short paragraphs, a bulleted list for several points, **bold** for the terms that carry the difference, about 100 words per side and about 60 per option.
- Fix options reach what should happen without changing the Model or any Requirement, and respect every Requirement that applies to the elements of the Drift, not only those it names. An option that asks for an exception to, or a change of, the Model or a Requirement is not a fix option.
- Omit `--critical`. Pass it only when the developer urgently needs to take a position on this difference; technical severity or complexity alone does not qualify.

## Asking

Run **`trama ask --root <project>`** with the JSON request on stdin, for every round of questions.

- Send one complete round as `{questions: [...]}`. Every question has a unique non-empty `id`, `question`, `options` as `{label, description}`, a zero-based `recommended` index, and an explicit `multi` boolean. Two fields are optional: `context` on a question and `details` on an option; when present they must not be blank.
- Keep `question` short: one sentence that reads on its own. Put the background of the decision in `context`, the tradeoff in a few words in `description`, and a longer explanation, only when it is needed, in `details`. `question`, `context`, `description` and `details` are Markdown; labels are plain text. Set `multi: true` only when several answers can hold together. Do not supply "Other": Trama always offers a free-text answer.
- A result with `status: "answered"` contains `answers` keyed by question id. An answered entry has the original `selected` labels and optional free-form `text`; a `status: "skipped"` entry is an explicit developer skip. Use the recommendation for that skipped decision, report it as an assumption for review, and do not ask it again.
- An `invalid-input` error means the request was refused before opening a round: correct the identified field and submit the corrected request.
- An **`editor-interrupted` error stops this workflow immediately**. Do not use partial answers or recommendations, fall back, retry, reroute, resume the round, or create or submit a Proposal from its unanswered decisions. Report that the editor was lost.
- **Wait for `trama ask` to finish**: it blocks until the developer answers. Run it with the default wait. If Cursor moves it to the background, wait only for the end of that command with Cursor's background-wait tool (`AwaitShell` on the command's id), which returns as soon as the command ends, then read its result at once. If that wait times out before the command ends, because the developer is still answering, wait again on the same command. Never use a timer or a fixed-duration wait, `sleep`, periodic reads of the terminal output or interval checks; never end the turn to be woken up; never treat `trama ask` as failed and never run it again.
- In Cursor's sandbox (`CURSOR_SANDBOX` is set), an initial `status: "unavailable"` may only mean the sandbox hides the editor: run the same `trama ask` once more outside the sandbox, asking Cursor for permission, and treat that result as the real one.
- Only an initial `status: "unavailable"` result means the editor is unavailable. Then you ask in no other way: you stop, open no Proposal, and tell the developer to open the project in the editor with Trama. When the developer says to continue, run the same `trama ask` again: it is a new round.
- A usage error of `trama ask` (exit code 2, wrong arguments, unrecognised command) or an input error is **never** editor unavailability: correct the call and repeat it. A deliberate skip is not re-asked.

- Never use your own question tool (`ask` in omp, `AskQuestion` in Cursor, `vscode_askQuestions` in VS Code, `AskUserQuestion` in Claude Code), and never write the questions in the conversation: `trama ask` is the only way to ask the developer.

If the developer said not to ask, use your recommendations and list them in the report.

## Experimental Drift blocker

This section applies only when the instruction says "The experimental Drift blocker is on". Without that sentence, never name a Task in `--not-blocking`, and skip this section.

When it applies, do this before each `trama drift new`:

1. Ask for the candidates with the references and origin you will file with: `trama drift candidates --ref <ref>… [--task <origin>]`. It lists the Tasks that Drift would block, the origin included, and writes nothing. If it lists none, file the Drift as usual.
2. Judge each candidate: does the difference you found touch that Task, its references or what it changes? Leave free only the Tasks the difference does not touch, with a one-line reason for each, in Italian. Judging only removes blocks: never leave free a Task the difference touches, and never name a Task the command did not list.
3. Pass each Task you leave free as `--not-blocking <permanent ID>` followed by `--not-blocking-reason "<reason>"`, in the same order: they pair the way `--option` and `--option-text` do. Pass none when the difference touches every candidate.

The judgement is made once, at filing: a Drift keeps the Tasks it leaves free and blocks every other one, including the Tasks created later about the same thing.

When you start sub-agents, pass them the sentence "The experimental Drift blocker is on" together with this section, and ask each one to report the permanent IDs of the Drifts it registered and, for each, whether it blocks any Task.

### Final resolution of the Drifts that block nothing

Keep the permanent ID of each Drift you file that blocks no Task: it blocks none when every candidate was left free, or when there was no candidate. Sub-agents report the same, as above.

When the import is over, gather those Drifts into one resolution, unless none is left:

1. Leave out a Drift that is critical or recurring (it follows an earlier Drift). Read the delegation with `trama drift autopilot --json`: if its `status` is `unavailable`, its `mode` is `disabled`, or it cannot be read, the delegation is off; otherwise leave out each non-critical, non-recurring Drift that has a Fix option, because the delegation resolves it on its own. A Drift left out stays open.
2. For each remaining Drift, record the recommended decision: when it has an attached Proposal, `proposal`, and the resolution carries that Proposal's changes as the trama-resolve-drifts skill describes; otherwise `fix-code` with option 1.
3. Announce it with `trama announce proposal "<title>"`, write it with `trama proposal new "<title>" --resolution --non-blocking --announcement <id> --body "<what is resolved and why>"`, and record each decision with `trama proposal resolve-drift <proposal id> <drift id> --decision <decision> [--option 1]`. Hand it over with `trama proposal submit <id>` and read its output.

Never approve or reject this resolution, and never start a Run because of it: the developer decides it, as any manual resolution.

## Autopilot boundary

Import describes existing code and only creates import Proposals and the Drifts of "Drifts for documentation differences"; it never resolves Drifts or runs implementation. Importing or filing a Drift is not authorization to decide it. If `trama.driftAutoPilot` is `enabled` or `yolo` (read it with `trama drift autopilot --json`), the host may later include an eligible open Drift from an import in a separate, coordinated resolution after Trama's scan/run barrier is clear; that work follows `trama-resolve-drifts`. Do not make import wait for, trigger, or perform that resolution yourself.

## PowerShell

The examples use POSIX syntax. In PowerShell, pass JSON on standard input with a pipe, for example `Get-Content -Raw round.json | trama ask --root <project>`, not `<`. On Windows PowerShell 5.1, set `$OutputEncoding` and `[Console]::OutputEncoding` to UTF-8 first, or non-ASCII characters arrive as `?`. Write `--body` and `--reason` values in single quotes, because PowerShell expands `$` and the backtick inside double quotes.
