---
name: trama-resolve-drifts
description: Use when asked to resolve the open Drifts of a project with a `.trama/` folder. Asks the developer one round of questions, one per Drift, and then opens the resolution from the answers.
---

# Trama: resolve Drifts

You resolve the **open Drifts** the instruction names. A Drift records that the code and the **Model** (with its **Requirements**) disagree. The developer decides, Drift by Drift, whether the code changes or the Model and Requirements do; you ask them, record the decisions in one **resolution Proposal**, and hand it over. The developer's approval of that Proposal is what resolves the Drifts. You never change the code here.

## Hand-over

A new Proposal starts as a **Draft**, not approvable. Finish its Drift list and every file, then run `trama proposal submit <id>` without `validate --proposal` or `proposal show` before it: read the changes in the submission's output. If they do not match what you meant, reopen the Proposal with `trama proposal edit <id>`, fix it, and submit again. If submission is refused, fix the reported problems and submit again. Only after it succeeds tell the developer to review it, and stop. Before every later change, call `trama proposal edit` or `trama proposal resolve-drift` again: it returns an open Proposal to Draft, so submit again when finished.

## Announcing cards

Trama has already announced the first resolution Proposal, so you do not announce it. When you write more Proposals after the first (see step 5), announce each one as soon as you know you will write it: `trama announce proposal "<title>"` prints an announcement ID. Pass it when you open that Proposal: `trama proposal new … --announcement <id>`. Never wait for the ghost to show and never skip or delay a card because of it; an unknown ID is only noted in the output.

## Hard rules

- NEVER edit `.trama/model/` or `.trama/requirements/` directly, nor the generated `trama-req-*` skills. Every change goes through a Proposal.
- Agents may approve or reject a Proposal, discard a Draft or resolve a Drift only when the developer explicitly asks for that decision in the conversation. Without that request, do not decide and do not ask the developer about it: stop and tell them the decision is theirs, on the Board. A request to prepare a resolution does not by itself authorize resolving the Drift.
- NEVER change the code of the project, and never create Tasks: approving the resolution creates the Task of each Drift to be fixed in the code.
- Never apply a recommendation for a Drift the developer skipped, and never decide a Drift on your own.

## Naming cards

Every live Proposal, Task and Drift has a temporary **short number** (`P3`, `T3`, `D3`) besides its **permanent identity** of eight characters.

- Name cards to the developer by short number and title, for example "Drift D2 – title", also in the report. A closed card has no number: use its permanent identity.
- In every command you run and every file you write (`proposal resolve-drift`, `--requires`, the Proposal body, questions saved in files) use **only the permanent identity**, taken from `--json` (field `id`; the number is the field `number`) or from the file name. **Never write a short number in a file**: it changes from one working copy to another.
- Give every card you create, and its announcement, a **short title**: at most five words, about 40 characters, a name for the card rather than a sentence describing the work (for example "Testo fantasma" instead of "Descrivere Start from Scratch e guidare le richieste scritte con un testo fantasma"). Put the detail in the body, even when the title loses information. No command checks the length of a title. Titles that Trama or a skill composes from another title stay as they are: `Fix code to match the …`, `Import: <Feature>`, the titles of checks.

## Language

When the instruction asks you to write in a language, everything you generate for Trama that the developer reads goes in that language: the bodies, descriptions and introductions of Proposals, Model files, Requirements, Tasks and Drifts; the titles of Proposals, Tasks, Drifts, Areas and Requirement fragments, and of announcements; the names of the System, Features, Machines, Actors and States; new identifiers (IDs of Features, Machines and Actors, Event names), transliterated into the allowed ASCII letters (`città` → `citta`, an Event `PAGAMENTO_RIUSCITO`); the text of questions and their options, and your replies in the conversation. Without a language in the instruction, nothing here changes.

- **Always in English**, whatever the language: technical terms are never translated: commands and tools (`git pull`, `npm install`), names of products, services, libraries and languages, and Trama's own terms (Proposal, Task, Drift, Board, Run, Scan). Also always English: code and its comments, commit messages, the project's own documentation; the headers Trama reads in files ("States", "Events", "General", "What happens", "What should happen", "Where in the code", "Fix options", "Already present"), the `(initial)` and `(final)` markers, the keys of Specs and the front matter fields. Trama's interface (panel, editor, command line) stays in English.
- **A language changes nothing already written.** When you edit a file written in another language, keep its existing text and write only the new or rewritten text in the chosen language; never translate the whole file.

## Steps

1. **Read the Drifts.** For each Drift the instruction names (and only those), run `trama drift show <id>` (add `--json` for structured data; `trama drift list --json` gives the creation order). It shows the two sides, the **Fix options**, the Model references and the attached Proposal with what it changes. Read that Proposal too, with `trama proposal show <id>`. A recurring Drift, one with `previous` in `trama drift show <id> --json`, has a chain of predecessors: run `trama drift show <previous-id> --json` on each of them in turn, from the nearest to the farthest, to get its identity, title and decision taken. A named Drift that is no longer open is left out; say so in the report. Stop, without asking anything, if none is left.
2. **Explore.** Read the Model and the code each Drift concerns: `trama machine <id>`, `trama state <machine/State>`, `trama event <owner.EVENT>`, `trama search <word>`, and the code that implements them. Facts are your job: never ask the developer what the Model, the Requirements or the code can tell you.
   **With sub-agents**, hand this exploration to them, at most four at once, in whatever way your agent starts sub-agents: one Drift (or a few that concern the same thing) each, with the commands above and the instruction to come back with a short account of what the Model says, what the code does, which Fix option fits and what the attached Proposal would change. A sub-agent asks the developer nothing and writes no Proposal. You alone ask and write. **Without sub-agents**, explore yourself, one Drift after the other.
3. **Ask once**, as described in "Asking" below: one single-choice question per Drift, in creation order.
4. **Decide from the answers.** Per Drift, from the chosen option:
   - a **Fix option** → `fix-code`, with that option's number (from 1, as listed by `trama drift show`) and the answer's free text as the note, if any;
   - a Drift **without Fix options** (it always has an attached Proposal) → the developer chose either **adopt the changes of the attached Proposal** (`proposal`: the resolution carries them as below) or **close without changing anything** (`dismissed`). Correcting the code is not a choice: when the free text asks for it, whatever the choice, the decision is `fix-code` with no `--option` and the free text as the note;
   - the **behaviour the code already has** → the Model and the Requirements must say so, so the decision is `proposal` and the resolution carries the changes to them. When the Drift has an attached Proposal, those are its changes, rewritten on the current Model if it has gone stale, adjusted by the free text; when it has none, they are what you work out from the Drift and the free text, and when the Model and Requirements already say it, nothing needs to change and the decision is `dismissed`;
   - a skipped question → no decision: the Drift stays out of the resolution and open.
5. **Write the resolution.** `trama proposal new "<title>" --resolution --body "<why>"`, in the language of the instruction (the title stays in English). The body says what is resolved, in a line per Drift with its short number and title and the decision, in domain words, and lists nothing else. For each Drift decided: `trama proposal resolve-drift <id> <drift-id> --decision proposal|dismissed|fix-code [--option <n>] [--note "<text>"]`; `--option` and `--note` go only with `fix-code`. For the `proposal` decisions, edit the files as `trama-design` does (`trama proposal edit <id> <model-path>` and `requirements/<area>/<fragment>.md`, the complete new version of each file, `trama proposal delete` to remove one), following its FORMAT.md, and change nothing the decisions do not require.
   With many Drifts, split them into Proposals that build on each other (open the later ones with `--requires <id>` of the earlier ones, and announce them as above), each Drift in exactly one of them. Keep Drifts whose Model changes touch the same files in one Proposal.
   Give each Proposal a short title (see Naming cards).
6. **Check the output.** Hand each Proposal over (step 7) without `trama validate --proposal` or `trama proposal show` before it: the submission's output reports the checks, and the changes and the Drift list it prints must match the answers, and nothing else. When it warns of a Requirement fragment larger than 12 KB that the resolution writes into, split that fragment in the same Proposal before handing it over, as step 7 says. Cut where it suits the project (usually by Feature or by a group of nearby Machines), give every new fragment a name and a description that say when it is needed, and move the sections without changing their text. Mind the 4,000-character budget of the Requirement skills: prefer a few medium fragments to many tiny ones, since every fragment adds a skill to it.
7. **Hand over.** Run `trama proposal submit <id>` (the earlier ones first) only after step 6; if refused, or its output does not match the answers, reopen it with `trama proposal edit <id>`, correct it, and submit again. Then report, in domain terms: the Proposals with their decisions per Drift, the Drifts left open because their question was skipped or because they were no longer open, and tell the developer to review the resolution on the board or with `trama proposal show <id>`. Stop. Do not approve it, reject it or resolve any Drift.

## Automatic mode

Choose the workflow from the instruction and current host authorization. Manual requests keep the existing question-and-resolution process below; an active setting alone does not authorize you to take an automatic step.

For an automatic job, obtain its exact scope with:

`trama drift autopilot --job <id> --json`

Use only Drift identities listed as currently authorized for that job. Query again immediately before each choice; if the coordinator is unavailable, the job identity is unrecognized, authorization is absent, or the setting no longer permits a Drift, do not choose it. Read each authorized Drift with `trama drift show <id>` and its attached Proposal if present. A Drift is eligible only when it is still open and the current host authorizes it. Do not open a question round, invent Fix options, choose the existing code behavior, alter the Model, resolve a Drift directly, or implement code.

For every authorized Drift, choose **only Fix option 1**. Record it in the automatic resolution with `--decision fix-code --option 1` and no invented note. Make no entry for unauthorized, stale, failed, or inapplicable cases. An attached Proposal does not change this: the host applies its ordinary resolution rules when it approves the submitted resolution.

Create the Draft with the job binding:

`trama proposal new "<title>" --resolution --automatic --job <id> --body "<why>"`

Add the authorized Drift decisions using `trama proposal resolve-drift <proposal-id> <drift-id> --decision fix-code --option 1`, then submit it with `trama proposal submit <proposal-id>` without `trama validate --proposal` or `trama proposal show` before it, and read its output. `--automatic` marks the resolution and imposes restrictions; it does not approve it. Never approve, reject, discard or implement it. After successful submission, report the Proposal and return control to the host. The host—not this agent—rechecks authorization, performs ordinary approval checks, waits for this resolution agent to finish, and may then launch a separate filtered Run.

When the authorized Drifts do not fit one Proposal, split them into a chain as in step 5: each Proposal with `--automatic --job <id>`, a later one opened with `--requires <id>` of the earlier ones, each Drift in exactly one of them. Submit them in dependency order, one at a time: the host approves each one as you submit it, so submit an earlier Proposal before writing the next. Never wait for an approval, and never approve one yourself.

If a case cannot be applied or fails, report it to the coordinator using `trama agent-event failed --job <id> --drift <drift-id> --reason "<text>"`; this records no persistent Drift decision and does not retry. If the editor is unavailable or the coordinator cannot be confirmed, stop new automatic work and report the reason; never claim success from a prepared chat prompt, notes, or withdrawn check.

## Autopilot limits

`trama.driftAutoPilot` is the application-scoped user setting for Drift delegation, `disabled` by default, with the values `disabled` (manual), `enabled` (delegates only non-critical Drifts) and `yolo` (also delegates critical ones). Only the user value counts; read it with `trama drift autopilot --json`, and an unrecognised value grants no delegation. A Drift must still have a first Fix option applicable, be open, outside any Draft/open resolution and not excluded after failure. The host coordinates across Trama windows and waits for all tracked scans and Runs; do not treat an idle delay or one archived Drift as clearance. Scans started without Trama are not tracked and must be coordinated by the developer.

The automatic flow is resolution first, then—only after successful host approval and normal agent completion—a distinct Run for that resolution's fix Tasks and their still-incomplete origin Tasks. It excludes unrelated Tasks; it does not approve or implement from this skill. There is no extra cycle, time, or spending limit: later scans may lead to further cycles. The developer can withdraw delegation or interrupt work. A setting change stops new steps, not a Task already started; failed cases are not retried automatically.

## Asking

Run **`trama ask --root <project>`** with the JSON request on stdin. Make **one round only**, with one question per Drift, in the order the Drifts were created, all single-choice (`multi: false`).

- Send one complete round as `{questions: [...]}`. Every question has an `id` that is the permanent identity of the Drift it asks about (so each Drift is named once), `question`, `options` as `{label, description}`, a zero-based `recommended` index, and an explicit `multi` boolean. Two fields are optional: `context` on a question and `details` on an option; when present they must not be blank.
- Keep `question` short: one sentence that reads on its own. Put the background of the Drift in `context`, the tradeoff in a few words in `description`, and the pros and cons of each option in `details`. `question`, `context`, `description` and `details` are Markdown; labels are plain text. Do not supply "Other": Trama always offers a free-text answer.
- The question presents the situation in the words of the domain. The options say what could happen: one for each Fix option of the Drift and one for the behaviour the code already has, all written the same way, without saying which option is what the code does today. A Drift without Fix options has exactly two options instead, listed in this order: adopting the changes of its attached Proposal (index `0`, the recommended one) and closing without changing anything. `recommended` is your own choice, except for such a Drift, where it is adopting the attached Proposal.
- For a recurring Drift, `context` lists the chain of its predecessors, from the nearest to the farthest, each with its identity, title and decision taken (`fix-code` with the title of the chosen option, `proposal` or `dismissed`), so the developer sees that the earlier decisions did not close the difference. Name each predecessor by its permanent identity: a resolved Drift has no short number.
- A result with `status: "answered"` contains `answers` keyed by question id. An answered entry has the original `selected` labels and optional free-form `text`. The free text of a question goes with the choice: with a Fix option it becomes the note; with the behaviour of the code it guides you when you write the changes to the Model; for a Drift without Fix options, when it asks to fix the code it becomes the note of a `fix-code` with no option.
- A `status: "skipped"` entry is an explicit developer skip. Apply no recommendation: leave that Drift out of the resolution, so it stays open, say so in the report, and do not ask it again.
- When the round is finished, open the resolution at once, without asking the developer to confirm a summary.
- An `invalid-input` error means the request was refused before opening a round: correct the identified field and submit the corrected request.
- An **`editor-interrupted` error stops this workflow immediately**. Do not open or hand over any resolution from partial answers or recommendations, do not fall back, retry, reroute or resume the round. Tell the developer that the editor was lost.
- **Wait for `trama ask` to finish**: it blocks until the developer answers. Run it with the default wait. If Cursor moves it to the background, wait only for the end of that command with Cursor's background-wait tool (`AwaitShell` on the command's id), which returns as soon as the command ends, then read its result at once. If that wait times out before the command ends, because the developer is still answering, wait again on the same command. Never use a timer or a fixed-duration wait, `sleep`, periodic reads of the terminal output or interval checks; never end the turn to be woken up; never treat `trama ask` as failed and never run it again.
- In Cursor's sandbox (`CURSOR_SANDBOX` is set), an initial `status: "unavailable"` may only mean the sandbox hides the editor: run the same `trama ask` once more outside the sandbox, asking Cursor for permission, and treat that result as the real one.
- Only an initial `status: "unavailable"` result means the editor is unavailable. Then you ask in no other way: you stop, open no resolution, and tell the developer to open the project in the editor with Trama. When the developer says to continue, run the same `trama ask` again: it is a new round.
- A usage error of `trama ask` (exit code 2, wrong arguments, unrecognised command) or an input error is **never** editor unavailability: correct the call and repeat it. A deliberate skip is not re-asked.

- Never use your own question tool (`ask` in omp, `AskQuestion` in Cursor, `vscode_askQuestions` in VS Code, `AskUserQuestion` in Claude Code), and never write the questions in the conversation: `trama ask` is the only way to ask the developer.

## PowerShell

The examples use POSIX syntax. In PowerShell, pass JSON on standard input with a pipe, for example `Get-Content -Raw round.json | trama ask --root <project>`, not `<`. On Windows PowerShell 5.1, set `$OutputEncoding` and `[Console]::OutputEncoding` to UTF-8 first, or non-ASCII characters arrive as `?`. Write `--body` and `--reason` values in single quotes, because PowerShell expands `$` and the backtick inside double quotes.
