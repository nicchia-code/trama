---
name: trama-resolve-drifts
description: Use when asked to resolve the open Drifts of a project with a `.trama/` folder. Asks the developer one round of questions, one per Drift, and then opens the resolution from the answers.
---

# Trama: resolve Drifts

You resolve the **open Drifts** the instruction names. A Drift records that the code and the **Model** (with its **Requirements**) disagree. The developer decides, Drift by Drift, whether the code changes or the Model and Requirements do; you ask them, record the decisions in one **resolution Proposal**, and hand it over. The developer's approval of that Proposal is what resolves the Drifts. You never change the code here.

## Hand-over

A new Proposal starts as a **Draft**, not approvable. Finish its Drift list and every file, then run `trama proposal move <id> open` without `proposal show` before it: read the changes in the hand-over's output. If they do not match what you meant, reopen the Proposal with `trama proposal edit <id>`, fix it, and hand it over again. If the hand-over is refused, fix the reported problems and hand it over again. Only after it succeeds tell the developer to review it, and stop. Before every later change, call `trama proposal edit <id>` again: it returns an open Proposal to Draft, so hand it over again when finished.

## Announcing cards

Trama has already announced the first resolution Proposal, so you do not announce it. When you write more Proposals after the first (see step 5), announce each one as soon as you know you will write it: `trama announcement new --input -` with `{"kind":"proposal","title":"<title>"}` prints an announcement ID. Pass it when you open that Proposal: `trama proposal new --input -` with `{"title":"<title>","kind":"resolution","announcement":"<id>"}`. Never wait for the ghost to show and never skip or delay a card because of it; an unknown ID is only noted in the output.

## Hard rules

- NEVER edit `.trama/model/` or `.trama/requirements/` directly, nor the generated `trama-req-*` skills. Every change goes through a Proposal.
- Agents may approve or reject a Proposal, discard a Draft or resolve a Drift only when the developer explicitly asks for that decision in the conversation. Without that request, do not decide and do not ask the developer about it: stop and tell them the decision is theirs, on the Board. A request to prepare a resolution does not by itself authorize resolving the Drift.
- NEVER change the code of the project, and never create Tasks: approving the resolution creates the Task of each Drift to be fixed in the code.
- Never apply a recommendation for a Drift the developer skipped, and never decide a Drift on your own.

## Naming cards

Every live Proposal, Task and Drift has a temporary **short number** (`P3`, `T3`, `D3`) besides its **permanent identity** of eight characters.

- Name cards to the developer by short number and title, for example "Drift D2 – title", also in the report. A closed card has no number: use its permanent identity.
- In every command you run and every file you write (`proposal edit` with `drifts`, `requires`, the Proposal body, questions saved in files) use **only the permanent identity**, taken from `--json` (field `id`; the number is the field `number`) or from the file name. **Never write a short number in a file**: it changes from one working copy to another.
- Give every card you create, and its announcement, a **short title**: at most five words, about 40 characters, a name for the card rather than a sentence describing the work (for example "Testo fantasma" instead of "Descrivere Start from Scratch e guidare le richieste scritte con un testo fantasma"). Put the detail in the body, even when the title loses information. No command checks the length of a title. Titles that Trama or a skill composes from another title stay as they are: `Fix code to match the …`, `Import: <Feature>`, the titles of checks.

## Language

When the instruction asks you to write in a language, everything you generate for Trama that the developer reads goes in that language: the bodies, descriptions and introductions of Proposals, Model files, Requirements, Tasks and Drifts; the titles of Proposals, Tasks, Drifts, Areas and Requirement fragments, and of announcements; the names of the System, Features, Machines, Actors and States; new identifiers (IDs of Features, Machines and Actors, Event names), transliterated into the allowed ASCII letters (`città` → `citta`, an Event `PAGAMENTO_RIUSCITO`); the text of questions and their options, and your replies in the conversation. Without a language in the instruction, nothing here changes.

- **Always in English**, whatever the language: technical terms are never translated: commands and tools (`git pull`, `npm install`), names of products, services, libraries and languages, and Trama's own terms (Proposal, Task, Drift, Board, Run, Scan). Also always English: code and its comments, commit messages, the project's own documentation; the headers Trama reads in files ("States", "Events", "General", "What happens", "What should happen", "Where in the code", "Fix options", "Already present"), the `(initial)` and `(final)` markers, the keys of Specs and the front matter fields. Trama's interface (panel, editor, command line) stays in English.
- **A language changes nothing already written.** When you edit a file written in another language, keep its existing text and write only the new or rewritten text in the chosen language; never translate the whole file.
- **No first person in Trama's texts.** In what you write for Trama (questions, contexts and options of rounds, titles and bodies of Proposals, Tasks and Drifts, History entries), Trama is always "Trama" and you are "the agent": no "I", "me", "my", "we", "our", and in Italian no "io", "noi" or first-person verbs. Your replies in the conversation are not Trama's texts and do not change. Text already written is not rewritten.

## Steps

1. **Read the Drifts.** For each Drift the instruction names (and only those), run `trama drift show <id>` (add `--json` for structured data; `trama drift list --json` gives the creation order). It shows the two sides, the **Fix options**, the Model references and the attached Proposal with what it changes. Read that Proposal too, with `trama proposal show <id>`. A recurring Drift, one with `previous` (always a list) in `trama drift show <id> --json`, has a chain of predecessors for each of its precedents: a Drift can have several (a unified Drift follows those of the Drifts it merged and those fixed by its origins). Run `trama drift show <previous-id> --json` on each of them in turn, from the nearest to the farthest, to get its identity, title and decision taken. A unified Drift (`unifies` in the same output) tells all the differences of the Drifts it merged and may have several origins (`origin` is a list); a Drift resolved as `unified` was merged without any decision and is not counted among the Drifts already resolved. A named Drift that is no longer open is left out; say so in the report. Stop, without asking anything, if none is left.
2. **Explore.** Read the Model and the code each Drift concerns: `trama model show <ref>` (a Machine `<id>`, a State `<machine/State>`, an Event `<owner.EVENT>`), `trama model list --input -` with `{"text":"<word>"}` in a heredoc, and the code that implements them. Facts are your job: never ask the developer what the Model, the Requirements or the code can tell you.
   **With sub-agents**, hand this exploration to them, at most N at once, where N is the limit in Trama's instruction (`20` if it gives none), whether Context Sharing is on or off, in whatever way your agent starts sub-agents: one Drift (or a few that concern the same thing) each, with the commands above and the instruction to come back with a short account of what the Model says, what the code does, which Fix option fits and what the attached Proposal would change. A sub-agent asks the developer nothing and writes no Proposal. You alone ask and write. **Without sub-agents**, explore yourself, one Drift after the other.
3. **Ask once**, as described in "Asking" below: one single-choice question per Drift, in creation order.
4. **Decide from the answers.** Per Drift, from the chosen option:
   - a **Fix option** → `fix-code`, with that option's number (from 1, as listed by `trama drift show`) and the answer's free text as the note, if any;
   - a Drift **without Fix options** (it always has an attached Proposal) → the developer chose either **adopt the changes of the attached Proposal** (`proposal`: the resolution carries them as below) or **close without changing anything** (`dismissed`). Correcting the code is not a choice: when the free text asks for it, whatever the choice, the decision is `fix-code` with no `option` and the free text as the note;
   - the **behaviour the code already has** → the Model and the Requirements must say so, so the decision is `proposal` and the resolution carries the changes to them. When the Drift has an attached Proposal, those are its changes, rewritten on the current Model if it has gone stale, adjusted by the free text; when it has none, they are what you work out from the Drift and the free text, and when the Model and Requirements already say it, nothing needs to change and the decision is `dismissed`;
   - a skipped question → no decision: the Drift stays out of the resolution and open.
5. **Write the resolution.** `trama proposal new --input -` with `{"title":"<title>","kind":"resolution","body":"<why>"}`, in the language of the instruction (the title stays in English). The body says what is resolved, in a line per Drift with its short number and title and the decision, in domain words, and lists nothing else. Record the decisions with `trama proposal edit <id> --input -` and `{"drifts":[{"drift":"<drift-id>","decision":"proposal|dismissed|fix-code","option":<n>,"note":"<text>"}]}`: one call may carry several decisions, and `removeDrifts` takes the ids of Drifts to take out; `option` and `note` go only with `fix-code`. For the `proposal` decisions, edit the files as `trama-design` does (`trama proposal edit <id> --input -` with `{"edit":["<model-path>","requirements/<area>/<fragment>.md"]}` prints the path to write for each, the complete new version of each file; `{"delete":[…]}` removes files), following its FORMAT.md, and change nothing the decisions do not require.
   With many Drifts, split them into Proposals that build on each other (open the later ones with `requires` of the earlier ones' ids, and announce them as above), each Drift in exactly one of them. Keep Drifts whose Model changes touch the same files in one Proposal.
   Give each Proposal a short title (see Naming cards).
6. **Check the output.** Hand each Proposal over (step 7) without `trama proposal show` before it: the hand-over's output reports the checks, and the changes and the Drift list it prints must match the answers, and nothing else. When it warns of a Requirement fragment larger than 12 KB that the resolution writes into, split that fragment in the same Proposal before handing it over, as step 7 says. Cut where it suits the project (usually by Feature or by a group of nearby Machines), give every new fragment a name and a description that say when it is needed, and move the sections without changing their text. Mind the 4,000-character budget of the Requirement skills: prefer a few medium fragments to many tiny ones, since every fragment adds a skill to it.
7. **Hand over.** Run `trama proposal move <id> open` (the earlier ones first) only after step 6; if refused, or its output does not match the answers, reopen it with `trama proposal edit <id>`, correct it, and hand it over again. Then report, in domain terms: the Proposals with their decisions per Drift, the Drifts left open because their question was skipped or because they were no longer open, and tell the developer to review the resolution on the board or with `trama proposal show <id>`. Stop. Do not approve it, reject it or resolve any Drift.

## Reworking a rejected resolution

When the instruction says to rework the rejected resolution `<id>` with the developer's feedback, on the Drifts `<d1>`, `<d2>` (Rework with feedback), follow the Steps for exactly those Drifts, with these changes:

- Read the rejected resolution with `trama proposal show <id>` (body, decisions per Drift, files and `## Feedback`). Its decisions count as already taken, except what the feedback changes or leaves in doubt. Without `## Feedback`, redo the same resolution on the Model as it is now.
- The round of step 3 is optional: ask one round only for the Drifts whose decision the feedback opens or leaves open, as in "Asking"; Drifts whose decision stands are recorded again without a question. A named Drift that is no longer open stays out, as step 1 says.
- Write the resolution again from scratch, on the Model as it is now, without requesting the rejected one. Pass `"reworks":"<id>"` in the `trama proposal new` of the resolution it opens (with several Proposals, only the first); Trama links it only when the named Proposal is rejected and no other one already reworks it, otherwise it creates it unlinked and the result says why.
- After the hand-over, tell the developer to review the new resolution. Never approve, reject or discard it, or resolve any Drift, yourself.

## Feedback on one Drift

This applies only when the instruction carries the sentence `The developer's feedback on how to resolve it: "<feedback>"` after the one-Drift instruction (Rework with feedback). Follow the Steps for that Drift only, with these changes:

- The feedback is the developer's indication of how to resolve the Drift. Take the decision it indicates in step 4 (a Fix option, adopting the attached Proposal, closing without changes, or the code already being right) and record it as step 5 says, with the feedback's content as the note of a `fix-code` decision when it helps the fix.
- Step 3 asks, in one round, only the decisions the feedback leaves open (for example which Fix option, when the feedback does not say). When the feedback settles the decision, open no round and never run `trama question new`.
- Never use the Drift's prepared question, even if it is valid. The Drift stays open until the developer decides the resolution.

## Asking

Run **`trama question new --root <project> --input -`** with the JSON request on standard input, in a heredoc. Make **one round only**, with one question per Drift, in the order the Drifts were created, all single-choice (`multi: false`).

- Send one complete round as `{questions: [...]}`. Every question has an `id` that is the permanent identity of the Drift it asks about (so each Drift is named once), `question`, `options` as `{label, description}`, a zero-based `recommended` index, and an explicit `multi` boolean. Two fields are optional: `context` on a question and `details` on an option; when present they must not be blank.
- Keep `question` short: one sentence that reads on its own. Put the background of the Drift in `context`, the tradeoff in a few words in `description`, and the pros and cons of each option in `details`. `question`, `context`, `description` and `details` are Markdown; labels are plain text. Do not supply "Other": Trama always offers a free-text answer.
- The developer sees only the round (each question, its context, its options and their own answers), never your conversation. Make every question self-contained: it says everything needed to decide, with no references to the conversation or to another question, and no first person (write "Trama" or "the agent", never "I" or "we"). Omit `context` when the question and the options are enough on their own.
- The question presents the situation in the words of the domain. The options say what could happen: one for each Fix option of the Drift and one for the behaviour the code already has, all written the same way, without saying which option is what the code does today. A Drift without Fix options has exactly two options instead, listed in this order: adopting the changes of its attached Proposal (index `0`, the recommended one) and closing without changing anything. `recommended` is your own choice, except for such a Drift, where it is adopting the attached Proposal.
- For a recurring Drift, `context` lists the chain of its predecessors (every chain, when it has several precedents), from the nearest to the farthest, each with its identity, title and decision taken (`fix-code` with the title of the chosen option, `proposal` or `dismissed`), so the developer sees that the earlier decisions did not close the difference. Name each predecessor by its permanent identity: a resolved Drift has no short number.
- A result with `status: "answered"` contains `answers` keyed by question id. An answered entry has the original `selected` labels and optional free-form `text`. The free text of a question goes with the choice: with a Fix option it becomes the note; with the behaviour of the code it guides you when you write the changes to the Model; for a Drift without Fix options, when it asks to fix the code it becomes the note of a `fix-code` with no option.
- A `status: "skipped"` entry is an explicit developer skip. Apply no recommendation: leave that Drift out of the resolution, so it stays open, say so in the report, and do not ask it again.
- When the round is finished, open the resolution at once, without asking the developer to confirm a summary.
- An `invalid-input` error means the request was refused before opening a round: correct the identified field and submit the corrected request.
- An **`editor-interrupted` error stops this workflow immediately**. Do not open or hand over any resolution from partial answers or recommendations, do not fall back, retry, reroute or resume the round. Tell the developer that the editor was lost.
- **Wait for `trama question new` to finish**: it blocks until the developer answers, however long that takes. Run it with no time limit: with omp pass `timeout: 0` to the bash tool, never a fixed value; with Cursor use the default wait. If Cursor moves it to the background, wait only for the end of that command with Cursor's background-wait tool (`AwaitShell` on the command's id), which returns as soon as the command ends, then read its result at once. If that wait times out before the command ends, because the developer is still answering, wait again on the same command. These waiting rules hold in Cursor and in omp alike: never use a timer or a fixed-duration wait, `sleep`, periodic reads of the terminal output or interval checks; never end the turn to be woken up; never treat `trama question new` as failed and never run it again.
- In Cursor's sandbox (`CURSOR_SANDBOX` is set), an initial `status: "unavailable"` may only mean the sandbox hides the editor: run the same `trama question new` once more outside the sandbox, asking Cursor for permission, and treat that result as the real one.
- Only an initial `status: "unavailable"` result means the editor is unavailable. Then you ask in no other way: you stop, open no resolution, and tell the developer to open the project in the editor with Trama. When the developer says to continue, run the same `trama question new` again: it is a new round.
- A usage error of `trama question new` (exit code 2, wrong arguments, unrecognised command) or an input error is **never** editor unavailability: correct the call and repeat it. A deliberate skip is not re-asked.

- Never use your own question tool (`ask` in omp, `AskQuestion` in Cursor), and never write the questions in the conversation: `trama question new` is the only way to ask the developer.

## Prepared question

The Async Drift Resolver prepares in advance the question the developer would be asked about a Drift, so Resolve opens at once. This section has two parts: how a prepared question is written (the other skills point here), and how you work when the instruction brings the answer already given.

### Writing a prepared question

Explore the Drift as step 2 of "Steps" says, with the same limit of sub-agents (read the Drift with `trama drift show <id>`, its attached Proposal with `trama proposal show <id>`, the Model and the code it concerns), but **ask the developer nothing and write no resolution**: you only record the question. Write one single-choice question (`multi: false`) for the Drift, in the language of the instruction, with these parts:

- `id`: the permanent identity of the Drift. `question`: one short sentence that reads on its own. `context`: the background of the Drift in the words of the domain; for a recurring Drift (`previous`, a list, in `trama drift show <id> --json`) every chain of its predecessors, from the nearest to the farthest, each with its permanent identity, title and decision taken.
- `options`, as `{label, description}` (and `details` when useful), all written the same way, without saying which one is what the code does today: one for each Fix option of the Drift, in their order, and one for the behaviour the code already has. A Drift **without Fix options** has exactly two options instead: adopting the changes of its attached Proposal (the recommended one) and closing without changing anything.
- `recommended`: your own choice, except for a Drift without Fix options, where it is adopting the attached Proposal.

Each option carries its decision, in `decisions`, one entry per option in the same order: `{"decision":"fix-code","option":<n>}` with the number of the Fix option (from 1, as `trama drift show` lists them), `{"decision":"proposal"}` or `{"decision":"dismissed"}`. The option for the behaviour the code already has is `proposal` when the Model or the Requirements must change to say it, and `dismissed` when they already say it and nothing needs to change. A `proposal` decision needs a Proposal attached to the Drift: when the Drift has none and the behaviour of the code needs one, write a Draft with `trama-design` (without its interview, `trama proposal new --input -` with the changes to the Model and the Requirements, not handed over) and pass its identity as `proposal` in the command below. Without Fix options, the options are `proposal` (the attached Proposal) and `dismissed`.

Record it with `trama drift edit <id> --input -` and `{"prepared":{"question":{…},"decisions":[…]},"proposal":"<id>"}` in a heredoc (`proposal` only when you attach a Draft in this command). The command checks the Drift is open, the question and the decisions, and computes the fingerprint of the Model and Requirements it was written against; a refusal names each problem: fix it and run the command again. The question is valid only while the Model and the Requirements of the Drift's references do not change.

### The answer is already given

This applies only when the instruction carries the sentence "The developer already answered this Drift's prepared question; do not ask again. Answer: <JSON>.". Then:

- Do not open a round and never run `trama question new`: the JSON after "Answer:" is the answer of the round for this Drift (`selected` labels and optional free `text`).
- Do steps 1, 2, 4 and 5 of "Steps" for that Drift only, with that answer as the answer of the round: decide from it as step 4 says and write the resolution as step 5 says, with one difference: create the Proposal with `"prepared":true` in `trama proposal new --input -` (`kind` `resolution`).
- Hand it over as step 7 says and report.

## Experimental context sharing

This section applies only when the instruction says "The experimental context sharing is on: …". Without that sentence, skip it and work as written above.

With it, when you hand a part of the work to a sub-agent, in whatever way your agent starts sub-agents, you pass it what you have already read that concerns its part, so it does not look for it again and does not read it again.

- **What you pass.** Of what you have already read, only what concerns that sub-agent's part, plus a short common part (the request and the decisions, when there are any): Trama's texts quoted as they are (the written request with its images put in words, the output of `trama model show`, `trama task show`, `trama drift show`, `trama proposal show`, the decisions of the interview) and the places in the code already known, one line per reference, ``- `<ref>` — <where in the code>``. Never code, never everything you gathered, and nothing you read only to pass it on.
- **What the sub-agent does.** It does not reread the Trama texts it received and reads on its own only the ones that are missing. It always reads the code, also at the places it received, always runs the commands that register (`trama task move <id> doing`, `trama comparison new`, `trama drift new`) and loads its skill as without this feature. A received place that no longer matches the code is ignored: it searches by itself. Context Sharing never stops a job.
- **What comes back.** Each sub-agent reports where it found the code of what it saw, one line per reference as above; you reuse those lines in your own work and for the sub-agents that follow.
- **Limits.** No sub-agent runs again a read-only Trama command for a text it received, and what you pass to each one concerns only its part: never copy into every sub-agent all that you gathered.

In this skill, the exploration of step 2 and the preparation of a question ("Writing a prepared question") give each sub-agent, for each of its Drifts, the output of `trama drift show`, the Proposal attached to it (`trama proposal show`), the chain of its `previous` Drifts and where the code is. The code at its Where in the code is read again before deciding. A unified Drift can follow several Drifts: pass every chain.

## PowerShell

The examples use POSIX syntax. In PowerShell, pass JSON with a pipe and `--input -`, for example `Get-Content -Raw round.json | trama question new --input -`, instead of `<` or a heredoc. On Windows PowerShell 5.1, set `$OutputEncoding` and `[Console]::OutputEncoding` to UTF-8 first, or non-ASCII characters arrive as `?`. Never pass the JSON as the text of `--input`: Windows PowerShell 5.1 strips the inner quotes of arguments to external programs.
