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
- Agents may approve or reject a Proposal, discard a Draft, resolve a Drift or delete a Task in To do (`trama task delete`) only when the developer explicitly asks for that decision in the conversation. Without that request, do not decide and do not ask the developer about it: stop and tell them the decision is theirs, on the Board. A request to prepare a resolution does not by itself authorize resolving the Drift or deleting a Task.
- NEVER change the code of the project, and never create Tasks: approving the resolution creates the Task of each Drift to be fixed in the code.
- Never apply a recommendation for a Drift the developer skipped, and never decide a Drift on your own.

## Naming cards

Every live Proposal, Task and Drift has a temporary **short number** (`P3`, `T3`, `D3`) besides its **permanent identity** of eight characters.

- Name cards to the developer by short number and title, for example "Drift D2 – title", also in the report. A closed card has no number: use its permanent identity.
- In every command you run and every file you write (`proposal edit` with `drifts`, `requires`, the Proposal body, questions saved in files) use **only the permanent identity**, taken from `--json` (field `id`; the number is the field `number`) or from the file name. **Never write a short number in a file**: it changes from one working copy to another.
- Give every card you create, and its announcement, a **short title**: at most five words, about 40 characters, a name for the card rather than a sentence describing the work (for example "Testo fantasma" instead of "Descrivere Start from Scratch e guidare le richieste scritte con un testo fantasma"). Put the detail in the body, even when the title loses information. No command checks the length of a title. Titles that Trama or a skill composes from another title stay as they are: `Fix code to match the …`, `Import: <Feature>`, the titles of checks.

## Notes on the ghost

While your work waits on the Board it has a ghost, and you tell the developer what you are doing with notes: `trama announcement edit --input -` with `{"note":"<one line>"}`, passed as `trama announcement edit --input - <<'JSON'`, the object and `JSON`. Without an ID the note goes to every ghost still waiting of your terminal or conversation (never to a comparison). Declare a note at the start of each stage of your work: reading the Drifts, each round of questions, writing the resolution, handing over. Write 3 to 6 notes for the whole job, never one per command. A note is one sentence of at most 120 characters (a longer one is cut) saying what you do and why, for the developer: no first person, no Trama command names and no short numbers of cards, in the language of the instruction when it asks for one (for example «Reads the Drift and the code it names before asking what to decide»). A note changes nothing else about the ghost and is never needed to deliver a card.

## Language

When the instruction asks you to write in a language, the texts listed below go in that language. Without a language in the instruction, nothing here changes.

- **In the language of the instruction:** the titles and bodies of Tasks and the titles of groups of Tasks; the titles, bodies and Fix options of Drifts; the titles, introductions and reasons of Proposals; the text, context and options of questions (also the resolution question the Async Drift Resolver prepares); the notes of ghosts and the titles of announcements; the titles, summaries and texts of History entries; your replies during the work and your final report; the replies in General.
- **Always in English**, whatever the language: the whole Model (the name of the System; the names of Features, Machines, Actors and States; IDs and Event names; the descriptions in Model files); the Requirements (Areas, titles and bodies of fragments); the Specs, also their `notes`; code and its comments, commit messages and the project's own documentation; the headers Trama reads in files ("States", "Events", "General", "What happens", "What should happen", "Where in the code", "Fix options", "Already present"), the `(initial)` and `(final)` markers and the front matter fields; technical terms (commands and tools such as `git pull` or `npm install`, names of products, services, libraries and languages) and Trama's own terms (Proposal, Task, Drift, Board, Run, Scan). Trama's interface (panel, editor, command line) stays in English.
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
- The question presents the situation in the words of the domain. The options say what could happen: one for each Fix option of the Drift and one for the behaviour the code already has, all written the same way, without saying which option is what the code does today. A Drift without Fix options has exactly two options instead, listed in this order: adopting the changes of its attached Proposal (index `0`, the recommended one) and closing without changing anything. `recommended` is your own choice, except for such a Drift, where it is adopting the attached Proposal, and for a Drift from a merge (next point).
- For a recurring Drift, `context` lists the chain of its predecessors (every chain, when it has several precedents), from the nearest to the farthest, each with its identity, title and decision taken (`fix-code` with the title of the chosen option, `proposal` or `dismissed`), so the developer sees that the earlier decisions did not close the difference. Name each predecessor by its permanent identity: a resolved Drift has no short number.
- For a Drift from a merge (`merge` is `true` in `trama drift show <id> --json`, and `trama drift show` prints `From a merge` after the title), the scan found it in code another branch brought with a merge and changed without the Model, so the code may be right. The question always has the option of the behaviour the code already has (decision `proposal`, with the attached Proposal that adapts the Model and the Requirements, or `dismissed` when they already say it) and always recommends it, whatever you would choose; `context` says that the Drift comes from code brought from another branch with a merge. A Drift from a merge without Fix options keeps recommending the adoption of its attached Proposal. Keeping the code is never a Fix option: the Fix options stay those of the Drift.
- A result with `status: "answered"` contains `answers` keyed by question id. An answered entry has the original `selected` labels and optional free-form `text`. The free text of a question goes with the choice: with a Fix option it becomes the note; with the behaviour of the code it guides you when you write the changes to the Model; for a Drift without Fix options, when it asks to fix the code it becomes the note of a `fix-code` with no option.
- A `status: "skipped"` entry is an explicit developer skip. Apply no recommendation: leave that Drift out of the resolution, so it stays open, say so in the report, and do not ask it again.
- When the round is finished, open the resolution at once, without asking the developer to confirm a summary.
- An `invalid-input` error means the request was refused before opening a round: correct the identified field and submit the corrected request.
- An **`editor-interrupted` error stops this workflow immediately**. Do not open or hand over any resolution from partial answers or recommendations, do not fall back, retry, reroute or resume the round. Tell the developer that the editor was lost.
- **Wait for `trama question new` to finish**: it blocks until the developer answers, however long that takes. Run it with no time limit: pass `timeout: 0` to the bash tool, never a fixed value. These waiting rules hold always: never use a timer or a fixed-duration wait, `sleep`, periodic reads of the terminal output or interval checks; never end the turn to be woken up; never treat `trama question new` as failed and never run it again.
- Only an initial `status: "unavailable"` result means the editor is unavailable. Then you ask in no other way: you stop, open no resolution, and tell the developer to open the project in the editor with Trama. When the developer says to continue, run the same `trama question new` again: it is a new round.
- A usage error of `trama question new` (exit code 2, wrong arguments, unrecognised command) or an input error is **never** editor unavailability: correct the call and repeat it. A deliberate skip is not re-asked.

- Never use omp's `ask` tool, and never write the questions in the conversation: `trama question new` is the only way to ask the developer.

## A unified Drift with differences

A Drift named in the instruction may be a unified Drift with differences (`differences` in `trama drift show <id> --json`: for each, its `drift`, `title`, `refs`, `options`, `linked`, `proposal`, and `open`). The developer decides it difference by difference, so it takes the place of several Drifts in the Steps, with these changes:

- **Read.** Only the open differences count; the decided ones keep their outcome and are left out of the round.
- **Ask.** One round, one single-choice question for each open difference, in the order of the differences, with `id` the `drift` of the difference. Each question follows the rules of "Asking" for the question of a Drift, with the fix options, the attached Proposal and the merge origin of that difference. `context` names the linked differences and what each choice implies for them.
- **Reconcile.** When the answers give different decisions to linked differences (a `fix-code` with any option counts as one decision), do not write them yet: ask again once, in one round, only the questions of those differences, with options adapted to the answers already given, and apply the answers.
- **Skipped.** A skipped or unanswered question leaves its difference out of the resolution and open, as for a Drift.
- **Record.** One entry of `drifts` for each answered difference: `{"drift":"<unified Drift id>","difference":"<the drift of the difference>","decision":"proposal|dismissed|fix-code","option":<n>,"note":"<text>"}`, with `option` counted on the fix options of that difference. Never write an entry without `difference` for such a Drift, nor `difference` for any other Drift; `removeDrifts` takes `{"drift":…,"difference":…}` to take out one entry. For each `proposal` decision, the resolution carries the changes of the Proposal attached to that difference, adjusted to the other decisions when they require it.
- **Report.** One line for each difference with its decision, and the differences left open.

## Prepared question

The Async Drift Resolver prepares in advance the question the developer would be asked about a Drift, so Resolve opens at once. This section has two parts: how a prepared question is written (the other skills point here), and how you work when the instruction brings the answer already given.

### Writing a prepared question

Explore the Drift as step 2 of "Steps" says, with the same limit of sub-agents (read the Drift with `trama drift show <id>`, its attached Proposal with `trama proposal show <id>`, the Model and the code it concerns), but **ask the developer nothing and write no resolution**: you only record the question. Write one single-choice question (`multi: false`) for the Drift, in the language of the instruction, with these parts:

- `id`: the permanent identity of the Drift. `question`: one short sentence that reads on its own. `context`: the background of the Drift in the words of the domain; for a recurring Drift (`previous`, a list, in `trama drift show <id> --json`) every chain of its predecessors, from the nearest to the farthest, each with its permanent identity, title and decision taken; for a Drift from a merge (`merge: true` in the same output) that the Drift comes from code brought from another branch with a merge, so the code may be right.
- `options`, as `{label, description}` (and `details` when useful), all written the same way, without saying which one is what the code does today: one for each Fix option of the Drift, in their order, and one for the behaviour the code already has. A Drift **without Fix options** has exactly two options instead: adopting the changes of its attached Proposal (the recommended one) and closing without changing anything.
- `recommended`: your own choice, except for a Drift without Fix options, where it is adopting the attached Proposal, and for a Drift from a merge, where it is always the option of the behaviour the code already has (for a Drift from a merge without Fix options, adopting the attached Proposal): the decision `proposal` with the attached Proposal that adapts the Model and the Requirements, or `dismissed` when they already say it.

Each option carries its decision, in `decisions`, one entry per option in the same order: `{"decision":"fix-code","option":<n>}` with the number of the Fix option (from 1, as `trama drift show` lists them), `{"decision":"proposal"}` or `{"decision":"dismissed"}`. The option for the behaviour the code already has is `proposal` when the Model or the Requirements must change to say it, and `dismissed` when they already say it and nothing needs to change. A `proposal` decision needs a Proposal attached to the Drift: when the Drift has none and the behaviour of the code needs one, write a Draft with `trama-design` (without its interview, `trama proposal new --input -` with the changes to the Model and the Requirements, not handed over) and pass its identity as `proposal` in the command below. Without Fix options, the options are `proposal` (the attached Proposal) and `dismissed`.

Record it with `trama drift edit <id> --input -` and `{"prepared":{"question":{…},"decisions":[…]},"proposal":"<id>"}` in a heredoc (`proposal` only when you attach a Draft in this command). The command checks the Drift is open, the question and the decisions, and computes the fingerprint of the Model and Requirements it was written against; a refusal names each problem: fix it and run the command again. The question is valid only while the Model and the Requirements of the Drift's references do not change.

### Writing a prepared round

A unified Drift with differences (`differences` in `trama drift show <id> --json`) has a prepared round: one question for each open difference. Write each question as "Writing a prepared question" says, with these changes:

- `id`: the `drift` of the difference, not the identity of the unified Drift. The options, their decisions and the recommendation follow the fix options of that difference (`options` of the difference in `--json`), the Proposal attached to that difference (`proposal`) and the origin of the difference: a difference born from a Drift from a merge (`merge: true` for the Drift it comes from) always offers and recommends the behaviour the code already has.
- `context` names the differences linked to this one (`linked`) by title and says what each option implies for them, so the developer decides one question knowing what it means for the others.
- Start from the prepared question the merged Drift had, when it was still valid (read it before the Drift was merged, or from the context of the difference), changing the context and the options only where the linked differences require it; write a new question only for a difference without a valid one.

Record the questions with `trama drift edit <id> --input -` and `{"prepared":{"questions":[{"difference":"<drift>","question":{…},"decisions":[…]}]},"proposal":{"difference":"<drift>","proposal":"<id>"}}` in a heredoc (`proposal` only when you attach a Draft to one difference in this command). The command may replace only some questions and keeps the others; it checks each question against its own difference and computes the fingerprint of the Model and Requirements on that difference's references. A decision `proposal` needs a Proposal attached to that difference.

### The answer is already given

This applies only when the instruction carries the sentence "The developer already answered this Drift's prepared question; do not ask again. Answer: <JSON>.". Then:

- Do not open a round and never run `trama question new`: the JSON after "Answer:" is the answer of the round for this Drift (`selected` labels and optional free `text`).
- Do steps 1, 2, 4 and 5 of "Steps" for that Drift only, with that answer as the answer of the round: decide from it as step 4 says and write the resolution as step 5 says, with one difference: create the Proposal with `"prepared":true` in `trama proposal new --input -` (`kind` `resolution`).
- Hand it over as step 7 says and report.

### The round of a unified Drift is already answered

This applies only when the instruction carries the sentence "The developer already answered this unified Drift's prepared round. Answers: <JSON>.". The JSON is keyed by difference (the `drift` of each difference): each answer has the `selected` labels and the optional free `text` of the question of that difference; the differences it does not list were skipped or not answered, and stay open.

- Do not open a round and never run `trama question new`, unless the instruction also carries "Linked differences got different decisions: reconcile them, asking again only their questions if needed.": then reconcile as "A unified Drift with differences" says, asking once, in one round, only the questions of those differences.
- Do steps 1, 2, 4 and 5 of "Steps" for that Drift, with the answers as the answers of the round, recording each decision with its `difference` as "A unified Drift with differences" says, and create the Proposal with `"prepared":true` in `trama proposal new --input -` (`kind` `resolution`).
- Hand it over as step 7 says and report.

### Some differences have a valid prepared question

This applies only when the instruction carries the sentence "Some differences of this unified Drift have a valid prepared question: keep them, prepare the others and ask one round about every open difference.". Keep the valid questions exactly as they are (`trama drift show <id> --json` lists the question of each open difference in `prepared.questions`, with its `status`). Write, as "Writing a prepared round" says, only the questions of the open differences that have none or whose question is no longer valid, with a `trama drift edit` that lists only those questions: the others are kept. Then ask one round about every open difference, with the question of each as the prepared round now holds it, and go on with the Steps as for any unified Drift with differences.

## Sub-agents context sharing

This section applies only when the instruction says "The sub-agents context sharing is on: …". Without that sentence, skip it and work as written above.

With it, when you hand a part of the work to a sub-agent, in whatever way your agent starts sub-agents, you pass it what you have already read that concerns its part, so it does not look for it again and does not read it again.

- **What you pass.** Of what you have already read, only what concerns that sub-agent's part, plus a short common part (the request and the decisions, when there are any): Trama's texts quoted as they are (the written request with its images put in words, the output of `trama model show`, `trama task show`, `trama drift show`, `trama proposal show`, the decisions of the interview) and the places in the code already known, one line per reference, ``- `<ref>` — <where in the code>``. Never code, never everything you gathered, and nothing you read only to pass it on.
- **What the sub-agent does.** It does not reread the Trama texts it received and reads on its own only the ones that are missing. It always reads the code, also at the places it received, always runs the commands that register (`trama task move <id> doing`, `trama comparison new`, `trama drift new`) and loads its skill as without this feature. A received place that no longer matches the code is ignored: it searches by itself. Context Sharing never stops a job.
- **What comes back.** Each sub-agent reports where it found the code of what it saw, one line per reference as above; you reuse those lines in your own work and for the sub-agents that follow.
- **Limits.** No sub-agent runs again a read-only Trama command for a text it received, and what you pass to each one concerns only its part: never copy into every sub-agent all that you gathered.

In this skill, the exploration of step 2 and the preparation of a question ("Writing a prepared question") give each sub-agent, for each of its Drifts, the output of `trama drift show`, the Proposal attached to it (`trama proposal show`), the chain of its `previous` Drifts and where the code is. The code at its Where in the code is read again before deciding. A unified Drift can follow several Drifts: pass every chain.

## PowerShell

The examples use POSIX syntax. In PowerShell, pass JSON with a pipe and `--input -`, for example `Get-Content -Raw round.json | trama question new --input -`, instead of `<` or a heredoc. On Windows PowerShell 5.1, set `$OutputEncoding` and `[Console]::OutputEncoding` to UTF-8 first, or non-ASCII characters arrive as `?`. Never pass the JSON as the text of `--input`: Windows PowerShell 5.1 strips the inner quotes of arguments to external programs.
