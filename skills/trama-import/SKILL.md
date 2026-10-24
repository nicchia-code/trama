---
name: trama-import
description: Use when asked to import, reverse-engineer or describe existing code as a Trama Model, in a project with a `.trama/` folder whose Model is empty or covers only part of the code. Reads the code and writes Proposals for the Model and its evident Requirements, describing the code as it is. Does not change code.
---

# Trama: import

You describe the **existing code** as a Trama **Model** (what the System does) plus its evident **Requirements** (how it is built), written as **Proposals** the developer approves. The Model you write describes the code **as it is**, bugs included; everything that looks wrong or that the documentation contradicts goes into the Proposal as a **doubt** for the developer, never silently "fixed".

## Hand-over

A new Proposal starts as a **Draft**, not approvable. Finish every file, then run `trama proposal move <id> open` without `proposal show` before it: read the changes in the hand-over's output. If they do not match what you meant, reopen the Proposal with `trama proposal edit <id>`, fix the files, and hand it over again. If the hand-over is refused, fix the reported problems and hand it over again. Only after it succeeds tell the developer to review it. Before every later file change, call `trama proposal edit <id>` again: it returns an open Proposal to Draft, so hand it over again when finished.

## Announcing cards

Once you have planned the Model (step 4), announce every Proposal you will write, each as soon as you know its title: `trama announcement new --input -` with `{"kind":"proposal","title":"<title>"}` prints an announcement ID. Pass it when you open that Proposal: `trama proposal new --input -` with `{"title":"<title>","kind":"import","announcement":"<id>"}`. The Board shows a ghost of each Proposal meanwhile. Never wait for a ghost to show and never skip or delay a Proposal because of it; an unknown ID is only noted in the output.

Announce every Drift you will file the same way, before you file it: `trama announcement new --input -` with `{"kind":"drift","title":"<title>"}` prints an announcement ID, and `trama drift new --input -` takes it in `announcement`. Never wait for its ghost to show.

## Hard rules

- NEVER edit code, `.trama/model/` or `.trama/requirements/` directly. Everything goes through Proposals opened with `kind: "import"`.
- Agents may approve or reject a Proposal, discard a Draft, resolve a Drift or delete a Task in To do (`trama task delete`) only when the developer explicitly asks for that decision in the conversation. Without that request, do not decide and do not ask the developer about it: stop and tell them the decision is theirs, on the Board. An import or design request does not by itself authorize these decisions or deleting a Task.
- **The code wins.** Model what the code does. Where the documentation (README, `docs/`, comments, API descriptions) says something else, model the code and file a Drift for that difference, as described in "Drifts for documentation differences". Where the code looks buggy or misses a case that the documentation does not mention, model it as it is and record a doubt.
- **Never change what is already modelled.** The one exception is the Specs, which the import updates (see "Specs"). If the Model already has Machines, do not edit their files. You may add new Features, Machines, Actors, Events of existing Actors and Requirement sections. If the code contradicts an existing Machine, do not fix it: list it in your report and suggest a Scan of that Feature.
- The Model has no code words: no variable, field, function, class, table, endpoint or file names in States, Transitions or Events. Write conditions and consequences in domain words. Code locations belong only in the doubts and in the `where` of a Drift.
- Import only **evident and stable** Requirements: `tech` (constraints and structure only: layers, platform, build and release rules written in the files; never the list of languages, frameworks and libraries, which belongs to the Specs), `data` (main entities and their fields, from schemas or models), `rules` (formulas, limits and policies written explicitly in the code). Never `ui` or `quality`: the code does not tell what was intended there.

## Naming cards

Every live Proposal and Drift has a temporary **short number** (`P3`, `D2`) besides its **permanent identity** of eight characters.

- Name Proposals and Drifts to the developer by short number and title, for example "Proposal P3 – Import: title" or "Drift D2 – title", also in the final report. A closed card has no number: use its permanent identity.
- In every command you run and every file you write (`requires`, the Proposal bodies, the doubts) use **only the permanent identity**, taken from `--json` (field `id`; the number is the field `number`) or from the file or folder name. **Never write a short number in a file**: it changes from one working copy to another.
- Give every card you create, and its announcement, a **short title**: at most five words, about 40 characters, a name for the card rather than a sentence describing the work (for example "Testo fantasma" instead of "Descrivere Start from Scratch e guidare le richieste scritte con un testo fantasma"). Put the detail in the body, even when the title loses information. No command checks the length of a title. Titles that Trama or a skill composes from another title stay as they are: `Fix code to match the …`, `Import: <Feature>`, the titles of checks.

## Notes on the ghost

While your work waits on the Board it has a ghost, and you tell the developer what you are doing with notes: `trama announcement edit --input -` with `{"note":"<one line>"}`, passed as `trama announcement edit --input - <<'JSON'`, the object and `JSON`. Without an ID the note goes to every ghost still waiting of your terminal or conversation (never to a comparison). Declare a note at the start of each stage of your work: reading the code, dividing it into Features, writing the Proposals. Write 3 to 6 notes for the whole job, never one per command. A note is one sentence of at most 120 characters (a longer one is cut) saying what you do and why, for the developer: no first person, no Trama command names and no short numbers of cards, in the language of the instruction when it asks for one (for example «Reads the order code to divide it into Features»). A note changes nothing else about the ghost and is never needed to deliver a card.

## Language

When the instruction asks you to write in a language, the texts listed below go in that language. Without a language in the instruction, nothing here changes.

- **In the language of the instruction:** the titles and bodies of Tasks and the titles of groups of Tasks; the titles, bodies and Fix options of Drifts; the titles, introductions and reasons of Proposals; the text, context and options of questions (also the resolution question the Async Drift Resolver prepares); the notes of ghosts and the titles of announcements; the titles, summaries and texts of History entries; your replies during the work and your final report; the replies in General.
- **Always in English**, whatever the language: the whole Model (the name of the System; the names of Features, Machines, Actors and States; IDs and Event names; the descriptions in Model files); the Requirements (Areas, titles and bodies of fragments); the Specs, also their `notes`; code and its comments, commit messages and the project's own documentation; the headers Trama reads in files ("States", "Events", "General", "What happens", "What should happen", "Where in the code", "Fix options", "Already present"), the `(initial)` and `(final)` markers and the front matter fields; technical terms (commands and tools such as `git pull` or `npm install`, names of products, services, libraries and languages) and Trama's own terms (Proposal, Task, Drift, Board, Run, Scan). Trama's interface (panel, editor, command line) stays in English.
- **A language changes nothing already written.** When you edit a file written in another language, keep its existing text and write only the new or rewritten text in the chosen language; never translate the whole file.
- **No first person in Trama's texts.** In what you write for Trama (questions, contexts and options of rounds, titles and bodies of Proposals, Tasks and Drifts, History entries), Trama is always "Trama" and you are "the agent": no "I", "me", "my", "we", "our", and in Italian no "io", "noi" or first-person verbs. Your replies in the conversation are not Trama's texts and do not change. Text already written is not rewritten.

## Steps

1. **Read what is modelled.** `trama model show`, `trama model show requirements`, and `trama model show <feature>` for each existing Feature. Note what is already covered.
2. **Survey the code yourself.** Manifests and configuration, entry points, routes and handlers, status fields and enums, workflows, jobs and timers, webhooks and integrations, screens and navigation, schemas, tests (they often state the intended behaviour), and the documentation.
3. **Ask one round of questions, then work alone.** In one call of `trama question new` (see "Asking" below) ask what you cannot find out yourself: which folders to import and which to ignore, and how to split the System into Features (offer your own split as the recommended option, plus one or two alternatives). Add any other question whose answer changes the whole import. After the answers, do not ask again: record the remaining uncertainty as doubts.
   **When the instruction already says which folders** (it says "Do not import these paths and do not ask which folders to import" followed by the paths, or "Import every folder and do not ask which folders to import"), the developer chose them in the setup wizard: do not ask which folders to import, do not read the excluded paths, and ask in your round only how to split the System into Features and the other questions that change the whole import. List the excluded paths among the folders you skipped in your report. Without that sentence, ask for the folders as above.
4. **Plan the Model.** One Machine per kind of thing with a lifecycle (an order, a payment, a subscription, a document), its States taken from the code's status values and the situations its handlers distinguish, its Transitions from the code paths that move between them, and the guards and side effects as prose. Who triggers what from outside (people, other systems, webhooks, time) are Actors that emit Events. Screens and navigation become a UI Machine only when the app has real navigation flows. Follow the format in [FORMAT.md](../trama-design/FORMAT.md).
5. **First Proposal: the System and its Actors.** `trama proposal new --input -` with `{"title":"Import: System and Actors","kind":"import","body":"<what was imported and from where>","label":"Import"}`. Write `system.md` (only if it still has placeholder text or does not exist), every new Actor with the Events it emits, the General sections of `tech` and `data`, and the Specs (see "Specs"). Requirements live in Area folders: `area.md` for the Area's description and title, fragments `requirements/<area>/<fragment>.md` for the sections (see "Requirements" in [FORMAT.md](../trama-design/FORMAT.md)). On a partly modelled project, skip this Proposal if nothing is new, Specs included; if only the Specs are new or changed, it carries only them.
6. **One Proposal per Feature.** `trama proposal new --input -` with `{"title":"Import: <Feature>","kind":"import","requires":["<first Proposal ID>","<ID of another Feature's Proposal whose Events this one reacts to>"]}` (the second entry is optional). Write `<feature>/feature.md`, its Machines, and the `data` and `rules` sections attached to them (`## order`, `## order/Paid`), in a fragment of the Area that suits that Feature, usually one fragment per Feature with a description saying when it is needed. Each Proposal is written and validated on top of the ones it requires, so only list Proposals you actually build on.
7. **Record the differences.** File one Drift for each difference between the documentation and the code, as described in "Drifts for documentation differences". Then end the body of each Proposal (`body`, or edit `proposal.md`) with a `## Doubts` section, one line each:
   - code that looks like a bug, a missing case or dead code, with its location, where the documentation does not say otherwise;
   - behaviour you could not determine;
   - an existing Specs entry that the code no longer uses (it stays in the Specs).
   Write "None." if there are none. Documentation differences are Drifts, never doubts.
   Give each Drift a short title (see Naming cards).
8. **Hand every Proposal over.** Run `trama proposal move <id> open` for each, without `trama proposal show` before it: its checks report the problems and its output prints the changes, which must describe the code and nothing else. When it warns of a fragment larger than 12 KB that the Proposal writes into, split that fragment in the same Proposal and hand it over again: cut by Feature or by a group of nearby Machines, give every new fragment a name and a description that say when it is needed, move the sections without changing their text, and prefer a few medium fragments to many tiny ones (every fragment counts against the 4,000-character budget of the Requirement skills). A dependency need not be approved for the hand-over. If a hand-over is refused or its output does not match, reopen the Proposal with `trama proposal edit <id>`, correct it, and hand it over again before continuing.
9. **Report and stop.** After every submission succeeds, list the Proposals in the order to approve them, with how many doubts each has, whether the Specs were written or updated, the Drifts you filed (each named by short number and title), the differences you could not file yet, the folders you skipped, and any contradiction with Machines that were already modelled (suggest a Scan for those Features). Approving an import Proposal starts no Scan: the Model already matches the code.

## Reworking a rejected import Proposal

When the instruction says to rework the rejected Proposal `<id>` with the developer's feedback (Rework with feedback), follow the Steps with these changes; everything else holds:

- Read the rejected Proposal with `trama proposal show <id>` (body, decisions, files, Tasks and `## Feedback`). Its decisions count as already taken, including the folders and the split into Features, except what the feedback changes or leaves in doubt. Without `## Feedback`, redo the same import on the Model as it is now.
- The round of step 3 is optional: ask one round of `trama question new` only for the decisions the feedback opens or leaves open, with the rules of `trama-design` ("The interview" and "Reworking a rejected Proposal"); otherwise work alone.
- Write the Proposal again from scratch, on the Model as it is now, without requesting the rejected one; the rework may be split into several Proposals, as an import is. Pass `"reworks":"<id>"` only in the first `trama proposal new` of the rework (never together with `request`); Trama links it only when the named Proposal is rejected and no other one already reworks it, otherwise it creates it unlinked and the result says why.
- After the hand-over, tell the developer to review the new Proposals. Never approve, reject or discard them yourself.

## Specs

The first Proposal describes the technologies of the code in the Specs, as `trama-setup` does, but deduced from the repository. Write `specs.yaml` with `trama proposal edit <id> --input -` and `{"edit":["specs.yaml"]}`, in the format of "Specs" in [FORMAT.md](../trama-design/FORMAT.md).

- **Source.** Fill the fields from what the repository declares: manifests, lockfiles, test and CI configuration, Dockerfiles, infrastructure files. A field that no file declares stays empty.
- **Entries.** None has `chosenByAgent`. The version is only the major one declared. `frameworks` lists only frameworks and libraries that shape the code. `notes` carries only constraints written in the files.
- **Specs already present.** Update them: add missing entries and fields, and correct the version and note of existing entries. An entry the code no longer uses stays, and goes among the `## Doubts` of the first Proposal.

## Drifts for documentation differences

A difference between the documentation and the code is a **Drift**, not a doubt: the developer decides, for each one, whether the code or the documentation is right. File it once with `trama drift new --input -`, without `task`, and with `proposal` only in the case below: no Proposal fixes it and no Task implements it otherwise.

- Before filing, run `trama drift list --input -` with `{"all":true,"refs":["<ref>"]}` for each element or Requirement it concerns: a difference that a resolved Drift closed stays closed while the Model or the Requirement there still says the same thing, so do not file it again. A Drift dismissed by its fix Task closed without changes does not count as closed: file it again if the code really diverges now. A Drift resolved as `unified` was merged into another Drift without any decision, so it does not count as closed either. If it is back after a fix of the code or an adaptation of the Model, set `previous` to the ID of that resolved Drift; the command refuses a previous Drift that is open, dismissed, `unified` or unknown.
- `refs` names an element or a Requirement section that already exists in the Model or the Requirements, because `trama drift new` refuses a reference that does not resolve. Name the nearest one that does, for example the Area's section for a stated rule. If the difference is about an element this import is still to create, record it as a doubt in its Proposal and list it in the report.
- **No fix respects both.** When no fix of the code respects the Model and the Requirements together (for example, two Requirements contradict each other), file the Drift with no `options` and with `proposal` set to a Draft that repairs the Model or the Requirements: a design Proposal, `trama proposal new --input -` with `kind` `"change"` (not `"import"`), written as `trama-scan` describes under "Drift without Fix options, with a Proposal". A Drift without Fix options is refused without a Proposal.
- The command: `trama drift new --input - <<'JSON'` and `JSON`, with `{"title":"<title>","refs":["<ref>"],"happens":"<what the code does>","should":"<what the documentation says and why it differs>","options":[{"title":"<title of the way you recommend>","text":"<what it changes and costs>"},{"title":"<title of another way>","text":"<…>"}],"where":"<where in the code>","announcement":"<id>"}` (up to five options). Re-read the code at the `where` place first, and file only if it really does what `happens` says. The two texts, `where` and two to five options, the recommended one first with different titles, are required, except in the no-fix case above (there `where` is still required, and no option is passed).
- Write both sides and the options at the level of behaviour: what the System does and what the documentation promises, in the words of the domain, not how the code does it. Name no variable, function, class, field or file unless the difference cannot be understood without it. Code locations go only in `where`, the files and no line numbers. Use short Markdown: short paragraphs, a bulleted list for several points, **bold** for the terms that carry the difference, about 100 words per side and about 60 per option.
- Fix options reach what should happen without changing the Model or any Requirement, and respect every Requirement that applies to the elements of the Drift, not only those it names. An option that asks for an exception to, or a change of, the Model or a Requirement is not a fix option.

## Asking

Run **`trama question new --root <project> --input -`** with the JSON request on standard input, in a heredoc, for every round of questions.

- Send one complete round as `{questions: [...]}`. Every question has a unique non-empty `id`, `question`, `options` as `{label, description}`, a zero-based `recommended` index, and an explicit `multi` boolean. Two fields are optional: `context` on a question and `details` on an option; when present they must not be blank.
- Keep `question` short: one sentence that reads on its own. Put the background of the decision in `context`, the tradeoff in a few words in `description`, and a longer explanation, only when it is needed, in `details`. `question`, `context`, `description` and `details` are Markdown; labels are plain text. Set `multi: true` only when several answers can hold together. Do not supply "Other": Trama always offers a free-text answer.
- The developer sees only the round (each question, its context, its options and their own answers), never your conversation. Make every question self-contained: it says everything needed to decide, with no references to the conversation or to another question, and no first person (write "Trama" or "the agent", never "I" or "we"). Omit `context` when the question and the options are enough on their own.
- A result with `status: "answered"` contains `answers` keyed by question id. An answered entry has the original `selected` labels and optional free-form `text`; a `status: "skipped"` entry is an explicit developer skip. Use the recommendation for that skipped decision, report it as an assumption for review, and do not ask it again.
- An `invalid-input` error means the request was refused before opening a round: correct the identified field and submit the corrected request.
- An **`editor-interrupted` error stops this workflow immediately**. Do not use partial answers or recommendations, fall back, retry, reroute, resume the round, or create or submit a Proposal from its unanswered decisions. Report that the editor was lost.
- **Wait for `trama question new` to finish**: it blocks until the developer answers, however long that takes. Run it with no time limit: pass `timeout: 0` to the bash tool, never a fixed value. These waiting rules hold always: never use a timer or a fixed-duration wait, `sleep`, periodic reads of the terminal output or interval checks; never end the turn to be woken up; never treat `trama question new` as failed and never run it again.
- Only an initial `status: "unavailable"` result means the editor is unavailable. Then you ask in no other way: you stop, open no Proposal, and tell the developer to open the project in the editor with Trama. When the developer says to continue, run the same `trama question new` again: it is a new round.
- A usage error of `trama question new` (exit code 2, wrong arguments, unrecognised command) or an input error is **never** editor unavailability: correct the call and repeat it. A deliberate skip is not re-asked.

- Never use omp's `ask` tool, and never write the questions in the conversation: `trama question new` is the only way to ask the developer.

If the developer said not to ask, use your recommendations and list them in the report.

## Drift blocker

This section applies only when the instruction says "The Drift blocker is on". Without that sentence, never name a Task in `notBlocking`, and skip this section.

When it applies, do this before each `trama drift new`:

1. Ask for the candidates with the references you will file with: `trama drift new --input -` with `{"refs":["<ref>"],"dryRun":true}`. It lists the Tasks that Drift would block, the origin included, and writes nothing. If it lists none, file the Drift as usual.
2. Judge each candidate: does the difference you found touch that Task, its references or what it changes? Leave free only the Tasks the difference does not touch, with a one-line reason for each, in Italian. Judging only removes blocks: never leave free a Task the difference touches, and never name a Task the command did not list.
3. Pass each Task you leave free in `notBlocking`, a list of `{"task":"<permanent ID>","reason":"<reason>"}`. Pass none when the difference touches every candidate.

The judgement is made once, at filing: a Drift keeps the Tasks it leaves free and blocks every other one, including the Tasks created later about the same thing.

When you start sub-agents, pass them the sentence "The Drift blocker is on" together with this section, and ask each one to report the permanent IDs of the Drifts it registered and, for each, whether it blocks any Task.

### Final resolution of the Drifts that block nothing

Keep the permanent ID of each Drift you file that blocks no Task: it blocks none when every candidate was left free, or when there was no candidate. Sub-agents report the same, as above.

When the import is over, gather those Drifts into one resolution, unless none is left:

1. Leave out a recurring Drift (it follows one or more earlier Drifts: `previous` is always a list in `--json`): the developer decides it, seeing the chains of its predecessors. A Drift left out stays open.
2. For each remaining Drift, record the recommended decision: when it has an attached Proposal, `proposal`, and the resolution carries that Proposal's changes as the trama-resolve-drifts skill describes; otherwise `fix-code` with option 1.
3. Announce it with `trama announcement new --input -` with `{"kind":"proposal","title":"<title>"}`, write it with `trama proposal new --input -` and `{"title":"<title>","kind":"resolution","nonBlocking":true,"announcement":"<id>","body":"<what is resolved and why>"}`, and record each decision with `trama proposal edit <proposal id> --input -` and `{"drifts":[{"drift":"<drift id>","decision":"<decision>","option":1}]}` (`option` only with `fix-code`). Hand it over with `trama proposal move <id> open` and read its output.

Never approve or reject this resolution, and never start a Run because of it: the developer decides it, as any manual resolution.

## Async Drift Resolver

This section applies only when the instruction says "The Async Drift Resolver is on: …". Without that sentence, skip it.

With it, at the very end of the work (after the last archiving and the `nonBlocking` resolution of the Drift blocker, if any, and before the final report), you prepare the question of every Drift this work filed, so Resolve opens at once. You alone do this, never a sub-agent that compares or implements.

1. **Find the Drifts.** Run `trama drift list --input -` with `{"currentJob":true,"unprepared":true}`; never read `TRAMA_JOB` by hand: the command reads it itself. It lists the open Drifts of this work, the advisor's included, with no valid prepared question and outside every resolution. A Drift already in a resolution (the `nonBlocking` one) is left out.
2. **Prepare each.** Follow "Writing a prepared question" in the `trama-resolve-drifts` skill (read it first) for each Drift, with the sub-agents you have: hand the exploration to at most `trama.maxParallelAgents` of them at once (the number the instruction gives, 20 when it gives none), one Drift (or a few that concern the same thing) each, and have each record its questions with `trama drift edit`. Without sub-agents, one Drift at a time. A sub-agent asks the developer nothing and registers no other card.
3. **Report.** The final report says how many Drifts were prepared and which were not (with the reason).

## Boundary

Import describes existing code and only creates import Proposals and the Drifts of "Drifts for documentation differences"; it never resolves Drifts or runs implementation. Importing or filing a Drift is not authorization to decide it: the decision is the developer's.

## Sub-agents context sharing

This section applies only when the instruction says "The sub-agents context sharing is on: …". Without that sentence, skip it and work as written above.

With it, when you hand a part of the work to a sub-agent, in whatever way your agent starts sub-agents, you pass it what you have already read that concerns its part, so it does not look for it again and does not read it again.

- **What you pass.** Of what you have already read, only what concerns that sub-agent's part, plus a short common part (the request and the decisions, when there are any): Trama's texts quoted as they are (the written request with its images put in words, the output of `trama model show`, `trama task show`, `trama drift show`, `trama proposal show`, the decisions of the interview) and the places in the code already known, one line per reference, ``- `<ref>` — <where in the code>``. Never code, never everything you gathered, and nothing you read only to pass it on.
- **What the sub-agent does.** It does not reread the Trama texts it received and reads on its own only the ones that are missing. It always reads the code, also at the places it received, always runs the commands that register (`trama task move <id> doing`, `trama comparison new`, `trama drift new`) and loads its skill as without this feature. A received place that no longer matches the code is ignored: it searches by itself. Context Sharing never stops a job.
- **What comes back.** Each sub-agent reports where it found the code of what it saw, one line per reference as above; you reuse those lines in your own work and for the sub-agents that follow.
- **Limits.** No sub-agent runs again a read-only Trama command for a text it received, and what you pass to each one concerns only its part: never copy into every sub-agent all that you gathered.

In this skill, the sub-agents that prepare the questions (Async Drift Resolver) receive, for each Drift, the output of `trama drift show`, the Proposal attached to it, the chain of its `previous` Drifts and where the code is. The code at its Where in the code is read again before deciding. A unified Drift can follow several Drifts: pass every chain.

## PowerShell

The examples use POSIX syntax. In PowerShell, pass JSON with a pipe and `--input -`, for example `Get-Content -Raw round.json | trama question new --input -`, instead of `<` or a heredoc. On Windows PowerShell 5.1, set `$OutputEncoding` and `[Console]::OutputEncoding` to UTF-8 first, or non-ASCII characters arrive as `?`. Never pass the JSON as the text of `--input`: Windows PowerShell 5.1 strips the inner quotes of arguments to external programs.
