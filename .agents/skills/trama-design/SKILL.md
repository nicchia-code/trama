---
name: trama-design
description: Use when the user wants to add, change or think through behaviour of a project that has a `.trama/` folder, or how it must be built (interface, technology, quality, data, business rules): new feature, new state, edge cases, "what happens when…", "the screen should look…". Turns the conversation into a Trama Proposal for the Model and its Requirements. Not for writing code.
---

# Trama: design

The **Model** in `.trama/model/` is the source of truth for how the System behaves. Next to it, the **Requirements** in `.trama/requirements/` say how it must be built: one folder per **Area** (by default `ui`, `tech`, `quality`, `data`, `rules`), with an `area.md` and **fragments** that hold its sections. You change both only through a **Proposal** that the developer approves as a whole. You never write code in this skill.

## Hand-over

A new Proposal starts as a **Draft**, not approvable. Finish every file, then run `trama proposal move <id> open` without `proposal show` before it: read the changes in the hand-over's output. If they do not match what you meant, reopen the Proposal with `trama proposal edit <id>`, fix the files, and hand over again. If the hand-over is refused, fix the reported problems and hand over again. Only after it succeeds tell the developer to review it. Before every later file change, call `trama proposal edit <id>` again: it returns an open Proposal to Draft, so hand over again when finished.

## Announcing cards

When the developer asked for a design from Trama's terminal, Trama has already announced the first Proposal on the Board, so you do not announce it. When you write more Proposals after the first (a large change split into Proposals that build on each other), announce each one as soon as you know you will write it: `trama announcement new --input -` with `{"kind":"proposal","title":"<title>"}` prints an announcement ID. Pass it when you open that Proposal: `trama proposal new --input -` with `"announcement":"<id>"` among its fields. The Board shows a ghost of the card meanwhile. Never wait for the ghost to show and never skip or delay a card because of it; an unknown ID is only noted in the output.

## Hard rules

- NEVER edit `.trama/model/` or `.trama/requirements/` directly, nor the generated `trama-req-*` skills. Every change goes through a Proposal, created with `trama proposal new --input -`.
- Agents may approve or reject a Proposal, discard a Draft, resolve a Drift or delete a Task in To do (`trama task delete`) only when the developer explicitly asks for that decision in the conversation. Without that request, do not decide and do not ask the developer about it: stop and tell them the decision is theirs, on the Board. After handing over a finished Proposal, stop and ask the developer to review it; an explicit design request does not by itself authorize approving, rejecting or discarding it, or deleting a Task.
- The Model describes *what can happen*, never *how it is built*: no variables, field names, database columns, endpoints, classes or file paths. A State is a situation in domain words ("Awaiting payment"), not a combination of values. How it is built (layout, styling, libraries, limits, data fields, formulas) belongs in the Requirements.
- Conditions and consequences of a Transition are plain prose after the colon.

## Naming cards

Every live Proposal, Task and Drift has a temporary **short number** (`P3`, `T3`, `D3`) besides its **permanent identity** of eight characters.

- Name cards to the developer by short number and title, for example "Proposal P3 – title". A closed card has no number: use its permanent identity.
- In every command you run and every file you write (the Proposal body, `requires`, `request`, reasons, references) use **only the permanent identity**, taken from `--json` (field `id`; the number is the field `number`) or from the file or folder name. **Never write a short number in a file**: it changes from one working copy to another.
- Give every card you create, and its announcement, a **short title**: at most five words, about 40 characters, a name for the card rather than a sentence describing the work (for example "Testo fantasma" instead of "Descrivere Start from Scratch e guidare le richieste scritte con un testo fantasma"). Put the detail in the body, even when the title loses information. No command checks the length of a title. Titles that Trama or a skill composes from another title stay as they are: `Fix code to match the …`, `Import: <Feature>`, the titles of checks.

## Notes on the ghost

While your work waits on the Board it has a ghost, and you tell the developer what you are doing with notes: `trama announcement edit --input -` with `{"note":"<one line>"}`, passed as `trama announcement edit --input - <<'JSON'`, the object and `JSON`. Without an ID the note goes to every ghost still waiting of your terminal or conversation (never to a comparison). Declare a note at the start of each stage of your work: exploring, each round of questions, writing the Model and the Requirements, writing the Tasks, handing over. Write 3 to 6 notes for the whole job, never one per command. A note is one sentence of at most 120 characters (a longer one is cut) saying what you do and why, for the developer: no first person, no Trama command names and no short numbers of cards, in the language of the instruction when it asks for one (for example «Explores the order Machine before asking the first questions»). A note changes nothing else about the ghost and is never needed to deliver a card.

## Language

When the instruction asks you to write in a language, everything you generate for Trama that the developer reads goes in that language: the bodies, descriptions and introductions of Proposals, Model files, Requirements, Tasks and Drifts; the titles of Proposals, Tasks, Drifts, Areas and Requirement fragments, and of announcements; the names of the System, Features, Machines, Actors and States; new identifiers (IDs of Features, Machines and Actors, Event names), transliterated into the allowed ASCII letters (`città` → `citta`, an Event `PAGAMENTO_RIUSCITO`); the text of questions and their options, and your replies in the conversation. Without a language in the instruction, nothing here changes.

- **Always in English**, whatever the language: technical terms are never translated: commands and tools (`git pull`, `npm install`), names of products, services, libraries and languages, and Trama's own terms (Proposal, Task, Drift, Board, Run, Scan). Also always English: code and its comments, commit messages, the project's own documentation; the headers Trama reads in files ("States", "Events", "General", "What happens", "What should happen", "Where in the code", "Fix options", "Already present"), the `(initial)` and `(final)` markers, the keys of Specs and the front matter fields. Trama's interface (panel, editor, command line) stays in English.
- **A language changes nothing already written.** When you edit a file written in another language, keep its existing text and write only the new or rewritten text in the chosen language; never translate the whole file.
- **No first person in Trama's texts.** In what you write for Trama (questions, contexts and options of rounds, titles and bodies of Proposals, Tasks and Drifts, History entries), Trama is always "Trama" and you are "the agent": no "I", "me", "my", "we", "our", and in Italian no "io", "noi" or first-person verbs. Your replies in the conversation are not Trama's texts and do not change. Text already written is not rewritten.
- **Self-contained Tasks.** The body of a Task is understood without the conversation that produced it: it says what must be true when done, with the conditions and consequences as the Model says them, and every decision of the interview that concerns it, because whoever implements it does not see that conversation.

## Steps

1. **Explore before asking.** When the instruction names a written design request, read it first (see "Written design requests" below). Then `trama model show`, then `trama model list --input -` with `{"text":"<word>"}` in a heredoc for what already exists (it searches the Requirements too), then `trama model show <ref>` for a Feature, Machine, State, Event or Actor (each view is followed by its Requirements), and `trama model show requirements` for the Areas. Reuse existing Machines, Actors and Events instead of duplicating them. Add `--json` if you need structured data. Facts are your job: never ask the developer anything the Model, the Requirements or the code can tell you.
   **With sub-agents**, before the first round, hand this exploration to them, at most N at once, where N is the limit in Trama's instruction (`20` if it gives none), in whatever way your agent starts sub-agents: give each one part of the request (the Machines and Features it involves, and the code that implements them), with the commands above and the instruction to come back with a short account of what exists, what the request would change there and what is unclear. A sub-agent asks the developer nothing and writes no Proposal. Gather their accounts; you alone run the remaining exploration, interview the developer and write the Proposal.
2. **Interview the developer in rounds** until every decision about the change is settled (see "The interview" below). Do not open a Proposal before that, and once the last round is answered open it straight away: do not ask the developer to confirm a summary first.
3. **Open a Proposal** for one coherent change, which may touch several Machines, Features and Areas: `trama proposal new --input -` with `{"title":"<title>","body":"<why>","label":"<short label>"}`. The `label` is short, at most 30 characters (for example the feature name), because the Proposal will carry Tasks. The body says why and summarises the decisions taken in the interview, one line each, with the assumptions you made for skipped questions. When the change is too large to review at once, split it into Proposals that build on each other: open the later ones with `requires` listing the IDs of the earlier ones; each is then written and validated on top of them and can only be approved after them. For a written design request, bind only the first Proposal to it with `request`.
   Give the Proposal a short title (see Naming cards).
4. **Edit files through it.** When the change alters the project's technologies, also write the Specs: `trama proposal edit <id> --input -` with `{"edit":["specs.yaml"]}` (see [FORMAT.md](./FORMAT.md)), giving `chosenByAgent` for each technology you picked yourself. For each Model file: `{"edit":["<model-path>"]}` (for example `checkout/order.md`) prints the path to edit. For an Area: `{"edit":["requirements/<area>/area.md"]}` for its description, title and introduction, and `{"edit":["requirements/<area>/<fragment>.md"]}` for a fragment, new or existing; several paths go in one call and it prints the path to write for each, one per line. An existing file arrives pre-filled; a new file arrives empty. To remove a file: `{"delete":["<path>"]}`. Write files as described in [FORMAT.md](./FORMAT.md). Always write the **complete** new version of a file. Put the Requirements the developer gave you in the same Proposal as the behaviour they belong to.
5. **Write the Tasks.** Only for an ordinary Proposal (`kind: change`) that is not attached to a Drift: an import, a resolution, or a Proposal written to answer a Drift has none. Take the scope from `trama proposal show <id>` (its `## Scope`) and split it by Machine, so that no reference has two Tasks. Entries that belong to no Machine (General sections, Feature descriptions, Actor Events, whole Areas) stay with you.
   - Whatever exploration already saw implemented is not a Task: write it in the `## Already present` section of the Proposal body, one line per element, as ``- `<ref>` — <where in the code>``.
   - **With sub-agents**, give each Machine group to one sub-agent, at most N at once, as in step 1. Each writes the Tasks of its own references and nothing else, asks the developer nothing, never runs `trama proposal move <id> open`, and comes back with the names of the files it wrote. Without sub-agents, do the groups one after the other.
   - Write each Task with `trama proposal edit <id> --input -` and `{"edit":["tasks/<slug>.md"]}` (several Tasks in one call): it prints the full path of each, with the permanent identity assigned there. To rewrite a Task, pass the full name it printed. Front matter has only `technical` (`false` by default; `true` for a Technical Task, which names no Model element) and `refs` (element references and Requirement sections, as in `refs`); then an H1 with the title and a prose body saying what must hold when the Task is done, with each condition and consequence as the Model states it. A non-technical Task names at least one Model element; every reference must exist once the Proposal is applied.
   - Give each Task a short title (see Naming cards).
   - A changed Specs field is a scope entry `specs#<field>`: cover it by a Task that names it in `refs`, as for any Requirement section.
   - Every scope entry must be covered: by a Task whose reference equals it or contains it (a Task on `task` covers `task/To do`), or by an `## Already present` line. A `requirements/<area>#<section>` entry is covered by a Task that names that section or its Area.
   - Do not show the Proposal before handing it over: the hand-over's output prints its Tasks and scope, and step 6 reads them.
6. **Hand over.** Run `trama proposal move <id> open` without `trama proposal show` before it. Its checks report every uncovered scope entry and every Task that names a missing element; fix the Tasks or the `## Already present` lines. A Requirement section titled with a State you removed or renamed is an error: update or remove that section in the same Proposal. Its warnings do not block, but act on them: a fragment over 12 KB that the Proposal writes into is split in the same Proposal (see "Good Requirement habits"); a switch of the Requirement skills between fragment and index mode goes into your hand-over summary. If the hand-over is refused, or its output does not match what was agreed, reopen the Proposal with `trama proposal edit <id>`, fix the files, and hand over again.
7. **Light code scan after submission.** Take the scope of the Proposal from the hand-over's output and read in the code only the entries that exploration did not already read; do not reread the rest, nor the `## Already present` lines. With sub-agents, split those entries among them, at most N at once, as in step 1; they come back with a short account and write nothing. A contradiction between the code and the Model or the Requirements is never a Drift: ask the developer a new round of questions about it (see "The interview"), reopen the Proposal with `trama proposal edit <id>`, keep it a Draft, update the Proposal and its Tasks with the answers, hand over again with `trama proposal move <id> open`, and light-scan only the new entries. The scan never files a Drift and is not announced as a check. After the hand-over succeeds, summarise the Proposal in a few lines, tell the developer to review it on the board or with `trama proposal show <id>`, and stop.
   Not after a refinement: the instruction to refine a stale Proposal (see "Refining a stale Proposal") skips this scan.

## The interview

Treat the change as a tree of decisions: each answer opens the decisions that hang off it. Work it in rounds.

- **One round = every open decision whose prerequisites are settled.** Ask them all at once, not one per message. A question whose meaning depends on another answer of the same round ("if you pick 1b…") belongs to a later round: leave it out.
- **Every question offers 2 to 5 concrete, materially different options**, each with its tradeoff in a few words, and **your recommendation**. Put the whole round in **one** call of `trama question new` (see "Asking" below), then stop and wait for the answers.
- **Cover behaviour first:** what starts it, what if it fails, is cancelled, times out, happens twice or out of order, who is told. Use `trama model show <machine>/<from> --input -` with `{"to":"<to>"}` in a heredoc to show the routes that already exist.
- **Then how it is built, Area by Area,** where the change touches it: what the screens look like (`ui`), what each thing holds (`data`), which limits and formulas apply (`rules`), required technology (`tech`), quality goals (`quality`). Skip Areas the change does not touch.
- **After each round** recompute what is open; answers often settle or remove other questions. The interview ends when nothing is left open or silently assumed.
- Never invent behaviour or Requirements the developer has not confirmed.

Skip the interview only when the developer says so ("don't ask, decide"), or when another Trama skill sends you here to attach a Proposal to a Drift. Then make reasonable choices and list each one, in the Proposal body and in your hand-over, as a decision for the developer to check.

### Asking

Run **`trama question new --root <project> --input -`** with the JSON request on standard input, in a heredoc, for every round of questions.

- Send one complete round as `{questions: [...]}`. Every question has a unique non-empty `id`, `question`, `options` as `{label, description}`, a zero-based `recommended` index, and an explicit `multi` boolean. Two fields are optional: `context` on a question and `details` on an option; when present they must not be blank.
- Keep `question` short: one sentence that reads on its own. Put the background of the decision in `context`, the tradeoff in a few words in `description`, and a longer explanation, only when it is needed, in `details`. `question`, `context`, `description` and `details` are Markdown; labels are plain text. Set `multi: true` only when several answers can genuinely hold together. Do not supply "Other": Trama always offers a free-text answer.
- The developer sees only the round (each question, its context, its options and their own answers), never your conversation. Make every question self-contained: it says everything needed to decide, with no references to the conversation or to another question, and no first person (write "Trama" or "the agent", never "I" or "we"). Omit `context` when the question and the options are enough on their own.
- A result with `status: "answered"` contains `answers` keyed by question id. An answered entry has the original `selected` labels and optional free-form `text`; a `status: "skipped"` entry is an explicit developer skip. Use the recommendation for that skipped decision, report it as an assumption for review, and do not ask it again.
- An `invalid-input` error means the request was refused before opening a round: correct the identified field and submit the corrected request.
- An **`editor-interrupted` error stops this workflow immediately**. Do not use partial answers or recommendations, fall back, retry, reroute, resume the round, or create or submit a Proposal from its unanswered decisions. Report that the editor was lost.
- **Wait for `trama question new` to finish**: it blocks until the developer answers, however long that takes. Run it with no time limit: pass `timeout: 0` to the bash tool, never a fixed value. These waiting rules hold always: never use a timer or a fixed-duration wait, `sleep`, periodic reads of the terminal output or interval checks; never end the turn to be woken up; never treat `trama question new` as failed and never run it again.
- Only an initial `status: "unavailable"` result means the editor is unavailable. Then you ask in no other way: you stop, open no Proposal, and tell the developer to open the project in the editor with Trama. When the developer says to continue, run the same `trama question new` again: it is a new round.
- A usage error of `trama question new` (exit code 2, wrong arguments, unrecognised command) or an input error is **never** editor unavailability: correct the call and repeat it. A deliberate skip is not re-asked.

- Never use omp's `ask` tool, and never write the questions in the conversation: `trama question new` is the only way to ask the developer.

## Written design requests

When the instruction names a file `.trama/requests/<id>.md`, the developer wrote the change down before asking.

- Read the **whole** file before exploring the Model. If it no longer exists, tell the developer that the request is gone and stop, without opening any Proposal.
- The request is the starting point of the interview, never its answers. The interview stays complete: every decision the request makes still becomes a question with its options, and the option the request indicates is your recommendation. Whatever it leaves open you ask about as usual.
- Look at every image the request links: local files, relative to the request file or to the project, and web addresses, when you can open them. An image you cannot see (missing file, unreachable address, a model that does not read images) you ignore silently, without telling the developer. Put in words what matters in the images you can see, and never copy, link or cite the request's images, or their paths, in the Proposal body, the Model, the Requirements, the Specs or the Tasks.
- **Images for the Tasks.** When the request links at least one image that you can see and that is a local file (in the request's images folder or elsewhere in the project), the **first round** of the interview has one single-choice question with two options, yes and no: whether to also send all those images to the model that implements the Tasks. Choose the recommendation by looking at the images (yes when they show something the code must respect, such as a screen or a layout). A skipped question counts as its recommendation. Images linked by a web address never count and never go to the Tasks. With no, bind no image. With yes, bind every local image to at least one Task, among the Tasks of the design's Proposals, that needs it: `trama proposal edit <id> --input -` with `{"images":[{"task":"<task identity>","path":"<image path>"}]}`, before handing over the Proposal bound to the request, because that hand-over deletes the request's images folder. Binding copies the file: the original in the project does not change. For the Tasks of Proposals you hand over later, bind an image by copying it from a Task it is already bound to (the path `trama task show` prints). This binding is the only way an image reaches whoever implements the Tasks.
- Bind the first Proposal of the design to it: `trama proposal new --input -` with `{"title":"<title>","body":"<why>","label":"<short label>","request":"<id>"}`. The Proposals that follow it with `requires` get no `request`. Handing the bound Proposal over deletes the request file, as intended.

## When a Proposal comes back

If the developer rejected it, the reason, when they gave one, is under `## Feedback` in `trama proposal show <id>`. A stale Proposal (the Model changed under it) is also replaced by a new one. Do not patch the rejected Proposal: open a **new** one. When the instruction asks to rework the rejected Proposal `<id>` with the developer's feedback, follow "Reworking a rejected Proposal" below; a rejection without that instruction stays as described here.

## Reworking a rejected Proposal

This section applies when the instruction says to rework the rejected Proposal `<id>` with the developer's feedback (Rework with feedback). Without that sentence, skip it.

1. **Read the rejected Proposal.** Run `trama proposal show <id>`: it gives the body, the decisions, the files, the Tasks and, when the developer wrote one, the `## Feedback`. The decisions of the rejected Proposal count as already taken, except what the feedback changes or leaves in doubt. Without `## Feedback`, redo the same change on the Model as it is now.
2. **Interview only where needed.** The interview is optional: run one round of `trama question new` (see "Asking") only for the decisions the feedback opens or leaves open, with the rules of "The interview". Ask nothing that the rejected Proposal already settled and the feedback leaves alone. Without open decisions, skip the round.
3. **Write the Proposal again, from scratch,** on the Model as it is now, following the steps above (explore, Proposal, files, Tasks, hand-over). Never request the rejected Proposal back and never edit its files. You may split the work into several Proposals that build on each other, as for any design.
4. **Bind it with `reworks`.** Pass `"reworks":"<id>"` (the identity of the rejected Proposal) only in the first `trama proposal new` of the rework; the Proposals that follow it with `requires` get none. `reworks` is refused together with `request`. Trama binds the new Proposal only when the rejected one exists, is rejected and no other Proposal already reworks it; otherwise it creates the Proposal without the link and the result says why, so read the result. The new Proposal takes the place of the rejected one in the creation order and in the `requires` of the Proposals that waited for it.
   When the rejected Proposal's Tasks had images, bind them to the new Tasks that need them, copying each from the old Task (the path `trama task show` prints for it) with `images` in `trama proposal edit`, and without asking the developer again.
5. **Hand over and stop.** Hand over as the Steps say. Never approve, reject or discard a Proposal yourself: after the hand-over, tell the developer to review the new one.

## Refining a stale Proposal

This section applies when the instruction says to refine the stale Proposal `<id>` on the current Model and Requirements, as this section says. Without that sentence, skip it.

Refining reworks the same Proposal. It keeps its identity, short number, place on the Board, label, chosen model, the images of its Tasks and the Proposals that require it. Trama approves it at the end of the work if it is not blocked; you never approve it.

1. **Read what the Proposal changes.** Run `trama proposal show <id>`: it gives the body with the decisions, the Tasks, the stale files and their differences from the files as they are now. Then read only the current Model and Requirements of those stale files, and the open Drifts that name elements or sections the Proposal touches. Do not read the code, do not run the light scan after the hand-over, do not archive Tasks or Drifts outside the Proposal, and do not announce cards: Trama announces them.
2. **The decisions in the body count as taken.** The developer answered them in the design. Ask at most one round of `trama question new`, and only when the current Model contradicts one of those decisions and you cannot choose yourself. Decide everything else, and write each such decision in the body as an assumption.
3. **When the current Model already has the whole change,** reconcile nothing. Ask one round with one question that explains which approved Proposal already contains the change, with two options: `Remove` (description: "Reject this Proposal: the current Model already has its change.") and `Keep` (description: "Leave it as it is, to refine; nothing changes."), recommended `Keep`. Name that Proposal to the developer by its short number and title.
   With `Remove`, reject it: `trama proposal move <id> rejected --input -` with `{"feedback":"Already in the current Model."}`, in a heredoc. That is the developer's decision, taken in the round, and the only case in which you reject a Proposal.
   With `Keep`, or when the round is skipped or lost, stop and change nothing.
4. **Otherwise, reconcile the Proposal with the current Model.**
   Run `trama proposal edit <id> --input -` with `{"rebase":true}`: the Proposal goes back to Draft and is marked `refining` until you hand it over again.
   Rewrite in full each file the Proposal touches, as the current file plus the Proposal's change, so that the same change is made on the Model as it is now. Never remove what other approved Proposals changed. Requirements are rewritten the same way, through `{"edit":[...]}` as in step 4 of the Steps.
   Update the Tasks and `## Already present` as the Steps say, and add to the body one line for each thing the refinement changed.
   Hand over with `trama proposal move <id> open`, as the Steps say, and fix what its checks report. Do not approve it: Trama does, at the end of the work.
5. **A Draft left half-way through a refinement** (still marked `refining`) resumes from there: reread its files, reconcile again as in step 4 if it is stale again, and go on.

## Good Model habits

- One Machine per kind of thing (Order, Payment, Cart), not per screen step. UI behaviour gets its own Machine when it has its own States (for example a checkout form), and talks to the domain only through Events.
- Name Events as facts that happened (`PAYMENT_SUCCEEDED`), owned by whoever emits them. Something outside the System (user, payment provider, time) is an Actor and only emits.
- Use sub-States to zoom in (`Paid` contains `Preparing` and `Ready to ship`), not to model parallelism; parallel things are separate Machines.
- Every Machine has exactly one `(initial)` State per level. End states are `(final)` and have no outgoing Transitions.
- After the Proposal is approved, `trama model check` lists, as warnings, unreachable States, dead ends and Events nobody receives. Fix those through another Proposal if they are real.

## Good Requirement habits

- An Area is a folder `requirements/<area>/`. Its `area.md` holds a `description` saying when an agent needs the Area, the title and, optionally, prose for the whole Area; no sections. The sections live in **fragments**, `requirements/<area>/<fragment>.md`, each with its own `description` saying when an agent needs that fragment, its title, and only sections. Keep descriptions about the kind of work ("Use when building or changing the checkout screens…").
- `## General` holds what applies everywhere in the Area, in whichever fragment it sits. Any other `##` section is titled with a Model reference (`checkout`, `order`, `order/Paid`, `user.CANCEL`) and applies to that element and everything inside it. A section appears once in its Area.
- Trama turns every fragment with content into a `trama-req-<area>-<fragment>` skill while the names and descriptions of those skills fit in 4,000 characters; beyond that, every Area becomes one index skill `trama-req-<area>` that lists its fragments. Short descriptions keep the project in the first mode.
- **Split a fragment that is or becomes larger than 12 KB** when your Proposal writes into it, in the same Proposal, before handing it over. Cut where it suits the project, usually by Feature or by a group of nearby Machines; give every new fragment a name and a description that say when it is needed; move the sections without changing their text. Prefer a few medium fragments to many tiny ones: every fragment adds a skill to the 4,000-character budget.
- Screens and navigation are behaviour: model them as a UI Machine whose States are screens or visual states, and attach their look (layout, components, texts) as `ui` Requirements on those States.
- Write Requirements as short, checkable statements ("Amounts show two decimals and the currency symbol"), not wishes ("nice formatting").
- Data fields and formulas go in `data` and `rules`, attached to the Machine or State they concern, never in the Model.
- A new Area is a new folder `requirements/<area>/` with a kebab-case name, an `area.md` and at least one fragment, for example to split `ui` into `ui-web` and `ui-mobile`.

## Sub-agents context sharing

This section applies only when the instruction says "The sub-agents context sharing is on: …". Without that sentence, skip it and work as written above.

With it, when you hand a part of the work to a sub-agent, in whatever way your agent starts sub-agents, you pass it what you have already read that concerns its part, so it does not look for it again and does not read it again.

- **What you pass.** Of what you have already read, only what concerns that sub-agent's part, plus a short common part (the request and the decisions, when there are any): Trama's texts quoted as they are (the written request with its images put in words, the output of `trama model show`, `trama task show`, `trama drift show`, `trama proposal show`, the decisions of the interview) and the places in the code already known, one line per reference, ``- `<ref>` — <where in the code>``. Never code, never everything you gathered, and nothing you read only to pass it on.
- **What the sub-agent does.** It does not reread the Trama texts it received and reads on its own only the ones that are missing. It always reads the code, also at the places it received, always runs the commands that register (`trama task move <id> doing`, `trama comparison new`, `trama drift new`) and loads its skill as without this feature. A received place that no longer matches the code is ignored: it searches by itself. Context Sharing never stops a job.
- **What comes back.** Each sub-agent reports where it found the code of what it saw, one line per reference as above; you reuse those lines in `## Already present`, in your own work and for the sub-agents that follow.
- **Limits.** No sub-agent runs again a read-only Trama command for a text it received, and what you pass to each one concerns only its part: never copy into every sub-agent all that you gathered.

In this skill:

- **Exploration (step 1).** Each sub-agent receives the request and the parts of `trama model show` you already read about its part.
- **Writing the Tasks (step 5).** The sub-agent of a Machine group receives the decisions of the interview, the new text of the Model and of the Requirements for its references, and the places in the code the exploration found.
- **Light code scan (step 7).** Each sub-agent receives the places in the code that are near its entries.

## PowerShell

The examples use POSIX syntax. In PowerShell, pass JSON with a pipe and `--input -`, for example `Get-Content -Raw round.json | trama question new --input -`, instead of `<` or a heredoc. On Windows PowerShell 5.1, set `$OutputEncoding` and `[Console]::OutputEncoding` to UTF-8 first, or non-ASCII characters arrive as `?`. Never pass the JSON as the text of `--input`: Windows PowerShell 5.1 strips the inner quotes of arguments to external programs.
