---
name: trama-setup
description: Use when the instruction names a written design request for starting a project from scratch (a file `.trama/requests/<id>.md`) and the Model of a project with a `.trama/` folder is empty. Interviews the developer about the stack, release, data and tests, then writes the first Proposal (kind setup) with the Model, Requirements, Specs and the Tasks that build the project. Not for writing code.
---

# Trama: setup

This skill starts an empty project. The **Model** in `.trama/model/` is still empty; the first **Proposal** of the project carries its first Model, its Requirements, its **Specs** and the Tasks that build the project skeleton. You never write code in this skill, and you never edit `.trama/model/`, `.trama/requirements/` or the generated `trama-req-*` skills directly: every change goes through the Proposal, created with `trama proposal new --input -` and `"kind":"setup"`.

For the format of Model and Requirement files, read [`trama-design`](../trama-design/FORMAT.md) (installed next to this skill); do not copy it here.

## Hard rules

- Agents may approve or reject a Proposal, discard a Draft or resolve a Drift only when the developer explicitly asks for that decision in the conversation. This skill never does so on its own, and without that request it does not ask the developer about it: hand the Proposal over and stop, and tell them the decision is theirs, on the Board. Approval on hand-over is Trama's, not yours.
- The Model describes *what can happen*, never *how it is built*: no variables, field names, database columns, endpoints, classes or file paths in Model files. Technology, layout, release and data choices belong in Requirements and Specs.
- In every command and every file use only the **permanent identity** of a card (from `--json`, field `id`, or from the file name). Never write a short number (`P3`, `T3`) in a file.
- Name cards to the developer by short number and title ("Proposal P3 – title"). A closed card has no number: use its identity.
- Give every card you create, and its announcement, a **short title**: at most five words, about 40 characters, a name for the card rather than a sentence describing the work (for example "Testo fantasma" instead of "Descrivere Start from Scratch e guidare le richieste scritte con un testo fantasma"). Put the detail in the body, even when the title loses information. No command checks the length of a title. Titles that Trama or a skill composes from another title stay as they are: `Fix code to match the …`, `Import: <Feature>`, the titles of checks.
- **Self-contained Tasks.** The body of a Task is understood without the conversation that produced it: it says what must be true when done, with the conditions and consequences as the Model says them, and every decision of the interview that concerns it, because whoever implements it does not see that conversation.

## Language

When the instruction asks you to write in a language, everything you generate for Trama that the developer reads goes in that language: the bodies, descriptions and introductions of Proposals, Model files, Requirements, Tasks and Drifts; the titles of Proposals, Tasks, Drifts, Areas and Requirement fragments, and of announcements; the names of the System, Features, Machines, Actors and States; new identifiers (IDs of Features, Machines and Actors, Event names), transliterated into the allowed ASCII letters (`città` → `citta`, an Event `PAGAMENTO_RIUSCITO`); the text of questions and their options, and your replies in the conversation. Without a language in the instruction, nothing here changes.

- **Always in English**, whatever the language: technical terms are never translated: commands and tools (`git pull`, `npm install`), names of products, services, libraries and languages, and Trama's own terms (Proposal, Task, Drift, Board, Run, Scan). Also always English: code and its comments, commit messages, the project's own documentation; the headers Trama reads in files ("States", "Events", "General", "What happens", "What should happen", "Where in the code", "Fix options", "Already present"), the `(initial)` and `(final)` markers, the keys of Specs and the front matter fields. Trama's interface (panel, editor, command line) stays in English.
- **A language changes nothing already written.** When you edit a file written in another language, keep its existing text and write only the new or rewritten text in the chosen language; never translate the whole file.
- **No first person in Trama's texts.** In what you write for Trama (questions, contexts and options of rounds, titles and bodies of Proposals, Tasks and Drifts, History entries), Trama is always "Trama" and you are "the agent": no "I", "me", "my", "we", "our", and in Italian no "io", "noi" or first-person verbs. Your replies in the conversation are not Trama's texts and do not change. Text already written is not rewritten.

## Notes on the ghost

While your work waits on the Board it has a ghost, and you tell the developer what you are doing with notes: `trama announcement edit --input -` with `{"note":"<one line>"}`, passed as `trama announcement edit --input - <<'JSON'`, the object and `JSON`. Without an ID the note goes to every ghost still waiting of your terminal or conversation (never to a comparison). Declare a note at the start of each stage of your work: reading the request, each round of questions, writing the Proposal, handing over. Write 3 to 6 notes for the whole job, never one per command. A note is one sentence of at most 120 characters (a longer one is cut) saying what you do and why, for the developer: no first person, no Trama command names and no short numbers of cards, in the language of the instruction when it asks for one (for example «Writes the first Proposal for the shop from the answers»). A note changes nothing else about the ghost and is never needed to deliver a card.

## Step 1: read the request

The instruction names a file `.trama/requests/<id>.md`. Read the **whole** file before anything else. If it does not exist, tell the developer that the request is gone and stop, without opening any Proposal.

The request is the starting point of the interview, never its answers. Every decision it makes still becomes a question with its options, the option the request indicates being your recommendation.

Look at every image the request links, with the same rules as `trama-design`: local files and web addresses you can open, images you cannot see ignored silently, what matters written in words, and no copy, link or citation of the request's images, or their paths, in the Proposal, the Model, the Requirements, the Specs or the Tasks.

**Images for the Tasks** work as in `trama-design` ("Images for the Tasks"): when the request links at least one local image you can see, the first round has one single-choice yes/no question about sending them also to the model that implements the Tasks; with yes, bind each local image to at least one Task that needs it with `trama proposal edit <id> --input -` and `{"images":[{"task":"<task identity>","path":"<image path>"}]}` before the hand-over (which deletes the request's images folder); with no, bind none. Images linked by a web address never count.

## Step 2: check the Model is empty

Run `trama model show --json` and `trama model list --input -` (with `{"text":"<word>"}` in a heredoc) only as needed. If the Model already has a Feature or an Actor, stop and tell the developer that `trama-design` is the skill for it: `trama proposal new` with `"kind":"setup"` would be refused.

## Step 3: interview in rounds

Ask in rounds with `trama question new --root <project> --input -` (the JSON in a heredoc), exactly as `trama-design` does (its "The interview" and "Asking" sections apply: one round per call, 2 to 5 options per question with tradeoffs, your recommendation on each, wait for the answers, no "Other", no fallback after `editor-interrupted`).

Ask only what the request leaves ambiguous and never repeat what is clear. When in doubt, ask one question more. Cover, when not already settled:

- **What the developer wants**: the purpose and the first behaviour of the System.
- **Languages and frameworks.**
- **Release**: desktop application, web or other; repository and where it lives (for example GitHub); cloud (Azure, AWS, Google Cloud) or on premise; for cloud, which resources; infrastructure files (Terraform, Bicep, or none, with a manual release).
- **Data and persistence.**
- **Tests and CI.**

A technology the developer names vaguely ("a web framework used today") you choose yourself, without asking. Record it in Specs with `chosenByAgent: true` and the reason.

## Step 4: write one Proposal

Open exactly one Proposal, bound to the request:

`trama proposal new --input -` with `{"title":"<title>","kind":"setup","body":"<why>","label":"<short label>","request":"<id>"}`

Give the Proposal a short title (see Hard rules) and a `label` of at most 30 characters (for example the project name), because it will carry Tasks.

The body says why and summarises each decision of the interview, one line each, with the assumptions made for skipped questions. Then:

1. **Model**: System, Features, Machines and Actors as they are agreed, each through `trama proposal edit <id> --input -` with `{"edit":["<model-path>"]}`.
2. **Requirements**: the Areas and fragments the developer gave you, through `{"edit":["requirements/<area>/…"]}` (see `trama-design`'s FORMAT.md).
3. **Specs**: every field clarified in the interview, with `chosenByAgent` and the reason for each technology you chose yourself.
4. **Tasks**: with `{"edit":["tasks/<slug>.md"]}`, one per piece of work. Include the technical Tasks that create the project skeleton, the repository, the CI and the infrastructure files chosen (`technical: true`, no Model element). Non-technical Tasks name at least one Model element, as in `trama-design`.

The hand-over below reads its own output: it must match what was agreed and nothing else.

## Step 5: hand over

Run `trama proposal move <id> open` without `trama proposal show` before it, as in `trama-design`. If it is refused, or its output does not match what was agreed, reopen the Proposal with `trama proposal edit <id>`, fix it, and hand over again.

After a successful hand-over, read the result of `trama proposal move <id> open`:

- If it says the Proposal was **approved**, tell the developer that the Proposal is approved and that its Tasks start.
- If it says the Proposal was **not approved** (it stays open), tell the developer that it was handed over and why it was not approved on its own, from the hand-over output.

Do not ask the developer to review the Proposal. Do not approve, reject or discard it yourself.

## Written design request

The request is consumed by the successful hand-over of the bound Proposal: its file is deleted then. Do not delete the file yourself.

## Reworking a rejected setup Proposal

When the instruction says to rework the rejected setup Proposal `<id>` with the developer's feedback (Rework with feedback), follow this skill with these changes; everything else stays as written:

- Read the rejected Proposal with `trama proposal show <id>` (body, decisions, files, Tasks and `## Feedback`) instead of a request file. Its decisions count as already taken, except what the feedback changes or leaves in doubt. Without `## Feedback`, redo the same setup on the Model as it is now. Step 2 still holds: the Model must be empty.
- The interview is optional: one round of `trama question new` only for the decisions the feedback opens or leaves open, as `trama-design` says in "Reworking a rejected Proposal".
- Write the setup Proposal again from scratch, without requesting the rejected one. Bind it with `"reworks":"<id>"` in `trama proposal new` (never together with `request`); Trama links it only when the named Proposal is rejected and no other one already reworks it, otherwise it creates it unlinked and the result says why.
- When the rejected Proposal's Tasks had images, bind them to the new Tasks that need them, copying each from the old Task (the path `trama task show` prints) with `images` in `trama proposal edit`, without asking the developer again.
- After the hand-over, report its result as Step 5 says (approved on hand-over, or open and why it was not approved) and, when the Proposal stays open, tell the developer to review it. Never approve, reject or discard it yourself.

## PowerShell

The examples use POSIX syntax. In PowerShell, pass JSON with a pipe and `--input -`, for example `Get-Content -Raw round.json | trama question new --input -`, instead of `<` or a heredoc. On Windows PowerShell 5.1, set `$OutputEncoding` and `[Console]::OutputEncoding` to UTF-8 first, or non-ASCII characters arrive as `?`. Never pass the JSON as the text of `--input`: Windows PowerShell 5.1 strips the inner quotes of arguments to external programs.
