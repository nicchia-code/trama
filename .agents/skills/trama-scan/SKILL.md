---
name: trama-scan
description: Use when asked to scan, sync or compare a Feature (or the whole System) of a project with a `.trama/` folder against its code, typically after a Trama Proposal was approved. Checks behaviour against the Model and construction against the Requirements. Produces Tasks for missing work and Drifts for differences. Does not change code, the Model or the Requirements.
---

# Trama: scan

A **Scan** compares the Model (source of truth for behaviour) and its **Requirements** (how it must be built) with the existing code, for one **Feature**, for what one Proposal changed, or, on request, the whole System. You produce **Tasks** (work to do) and **Drifts** (differences the developer must decide on). You change neither code, nor Model, nor Requirements.

## Hand-over

A new Proposal starts as a **Draft**, not approvable. Finish every file, then run `trama proposal submit <id>` without `validate --proposal` or `proposal show` before it: read the changes in the submission's output. If they do not match what you meant, reopen the Proposal with `trama proposal edit <id>`, fix the files, and submit again. If submission is refused, fix the reported problems and submit again. Only after it succeeds tell the developer to review it. A Proposal meant for a Drift is attached to that Drift when the Drift is filed, before it is handed over, so it never shows up alone. Before every later file change, call `trama proposal edit` again: it returns an open Proposal to Draft, so submit again when finished.

## Announcing cards

Announce a card only when it is a Drift with a Proposal: `trama announce drift "<title>"` prints an announcement ID; pass it to both `trama proposal new … --announcement <id>` and `trama drift new … --announcement <id>`. The Board shows a ghost of it meanwhile. Do not announce cards one by one: a Machine comparison's briefing (`trama compare brief`) announces the comparison, and its cards are filed in bulk by one `trama compare file`. Never wait for a ghost to show; an unknown ID is only noted in the output.

## Announcing the check

A scan that is not part of a `trama-implement` run (after an approval, or asked by hand) is a **check**: announce it before you read the code, with `trama announce check "<title>" --phase scanning`, which prints its ID. The title says the work, in English: `Scanning System`, `Scanning Feature <a>` or `Scanning Features <a>, <b>`. Run `trama announce done <id>` when the comparison is over, before the report. Inside a `trama-implement` run, use that run's check and announce none. A sub-agent never announces a check. Never wait for the ghost to show; an unknown ID is only noted in the output.

## Hard rules

- NEVER edit code, `.trama/model/` or `.trama/requirements/` in this skill.
- Agents may approve or reject a Proposal, discard a Draft or resolve a Drift only when the developer explicitly asks for that decision in the conversation. Without that request, do not decide and do not ask the developer about it: stop and tell them the decision is theirs, on the Board. A request to scan or design does not by itself authorize deciding it.
- Compare behaviour at the level of the **Diagram**: States, Transitions, Events, who reacts to what. Compare construction against what the Requirements actually state. Variable names, structure, style and performance that no Requirement mentions are not Drifts.
- The Model matters far more than the code. By default the code is wrong, not the Model.

## Naming cards

Every live Proposal, Task and Drift has a temporary **short number** (`P3`, `T3`, `D3`) besides its **permanent identity** of eight characters.

- Name cards to the developer by short number and title, for example "Task T3 – title" or "Drift D2 – title", also in the final report. A closed card has no number: use its permanent identity.
- In every command you run and every file you write (`--proposal`, `--task`, card bodies, references) use **only the permanent identity**, taken from `--json` (field `id`; the number is the field `number`) or from the file name. **Never write a short number in a file**: it changes from one working copy to another.
- Give every card you create, and its announcement, a **short title**: at most five words, about 40 characters, a name for the card rather than a sentence describing the work (for example "Testo fantasma" instead of "Descrivere Start from Scratch e guidare le richieste scritte con un testo fantasma"). Put the detail in the body, even when the title loses information. No command checks the length of a title. Titles that Trama or a skill composes from another title stay as they are: `Fix code to match the …`, `Import: <Feature>`, the titles of checks.

## Language

When the instruction asks you to write in a language, everything you generate for Trama that the developer reads goes in that language: the bodies, descriptions and introductions of Proposals, Model files, Requirements, Tasks and Drifts; the titles of Proposals, Tasks, Drifts, Areas and Requirement fragments, and of announcements; the names of the System, Features, Machines, Actors and States; new identifiers (IDs of Features, Machines and Actors, Event names), transliterated into the allowed ASCII letters (`città` → `citta`, an Event `PAGAMENTO_RIUSCITO`); the text of questions and their options, and your replies in the conversation. Without a language in the instruction, nothing here changes.

- **Always in English**, whatever the language: technical terms are never translated: commands and tools (`git pull`, `npm install`), names of products, services, libraries and languages, and Trama's own terms (Proposal, Task, Drift, Board, Run, Scan). Also always English: code and its comments, commit messages, the project's own documentation; the headers Trama reads in files ("States", "Events", "General", "What happens", "What should happen", "Where in the code", "Fix options", "Already present"), the `(initial)` and `(final)` markers, the keys of Specs and the front matter fields. Trama's interface (panel, editor, command line) stays in English.
- **A language changes nothing already written.** When you edit a file written in another language, keep its existing text and write only the new or rewritten text in the chosen language; never translate the whole file.

## Steps

1. **Scope.** Use the Feature you were given, or `trama system` for the list. For each Machine, `trama feature <id>` shows its scope; do not read the Machine itself (`trama machine`, `trama state`, `trama event`, `trama paths`) nor run `trama analyze`: `trama-compare` brings them in its briefing. Read the Requirements only through their `## General` sections, one Area at a time: `trama requirements <area>#General` (`trama requirements` lists the Areas), and keep them in mind for everything. Do not read a whole Area for its other sections: they reach the comparison through its briefing.
   **What a Proposal changed.** When the instruction limits the scan to what a Proposal changed, run `trama proposal show <id>` and read its `## Scan scope`: one reference per line, each with why it is there. Compare with the code **only those references**, not the whole Features; a Machine's references go to its comparison as `--ref`. `changed` is an element or Requirement section added or changed, with what it contains; `leads into a change` is a Transition that enters or reacts to it, to check it still fits; `removed, its container` is the nearest element still there of something removed: look for the code that implemented what was removed, and file a Task to take it out. If the Proposal has no `## Scan scope` (approved before it existed), scan the Features it touched, as before. A targeted scope is the recommended choice when the Proposal changed only a few parts of the Model or the Requirements; a scan of the whole System is the only one that compares all the code with all the Model.
   **What several Proposals changed.** When the instruction names several Proposals (they are listed oldest first), run `trama proposal show <id>` for each and read every `## Scan scope`. Take the union of their references and compare each one **once**, against the current Model, however many scopes list it: a later Proposal may have changed or removed what an earlier one added, so the current Model decides what the code must do. A reference whose element is no longer in the Model counts as `removed, its container` for its nearest element still there. A Proposal without `## Scan scope` brings the Features it touched.
2. **Avoid duplicates.** Read `trama task list` and `trama drift list` once, first, for the parts you compare yourself; sub-agents and `trama-compare` get the open and resolved cards of their references from their briefing. Do not file what is already there. Before filing a Drift, run `trama drift list --all --ref <ref>` for each element or Requirement it concerns: a difference that a resolved Drift closed stays closed while the Model or the Requirement there still says the same thing, so do not file it again. A Drift dismissed by its fix Task closed without changes does not count as closed: the difference was not there, so file it again if the code really diverges now. If the difference is back after a fix of the code or an adaptation of the Model, file the new Drift with `--previous <id>` of that resolved Drift; the command refuses a previous Drift that is open, dismissed or unknown, and its output says when the Drift is recurring.
3. **Compare the Machines, then the rest.** Every scan, including the selective scan at the end of a `trama-implement` run, compares every Machine in its scope directly against its code, following the `trama-compare` skill. Do not triage Machines or use a classifier.
   - **With sub-agents**: give each Machine to a `trama-analysis` sub-agent, together with the Machine's name and, when the scan is limited to a Proposal's `## Scan scope`, the scope references of that Machine (passed as `--ref`). The sub-agent follows `trama-compare`, files its own cards in one `trama compare file`, and returns the list of cards it created. Do not pass it lists of open Tasks or Drifts: its briefing carries them. Run at most N sub-agents at once, where N is the limit in the instruction ("Run at most N sub-agents at once"), or twenty when the instruction gives no limit. If sub-agents are unavailable, compare the Machines yourself, one after the other, following `trama-compare`.

   The General Requirements, and the sections that name no Machine (a Feature, an Actor, an Event of an Actor, an Area), stay with you: compare them yourself, in the same way. You write the one report.

4. **Find the implementation.** For the parts you compare yourself (the General Requirements and the sections that name no Machine), search the code for where they live: handlers, reducers, components, routes, jobs, database transitions. The Model carries no code hints; do not expect any. If there are no source files at all, see "No code at all" under Judgement.

5. **Compare the parts you keep** (the General Requirements and the sections that name no Machine), and decide:
| You find | You file |
|---|---|
| A State, Transition or Event in the Model that the code lacks | a **Task** |
| A Requirement the code does not implement yet (a screen without the required layout, a missing limit, a library not adopted) | a **Task** referencing the Requirement |
| Code that does something the Model says differently, or something extra that would add or change a State or Transition in the Diagram | a **Drift** |
| Code that contradicts a Requirement (uses a forbidden library, shows a different layout, applies another formula) | a **Drift** referencing the Requirement |
| Code that handles a case the Model forgot, and it looks **important** (real user-visible or data-affecting behaviour, not a detail) | a **Drift with an attached Proposal** |
| Anything below Diagram level that no Requirement mentions | nothing |

6. **File Tasks.** One Task per coherent unit of work (typically a State with its Transitions), as specific as possible in `--ref`:
   `trama task new "<what to implement>" --ref order/Refunding --ref order/Paid/user.CANCEL --ref requirements/ui#order/Paid --body "<in domain words: what must be true when done>"`.
   Give the Task a short title (see Naming cards).
   Reference the Requirement sections the Task must satisfy next to the Model elements. A Task that only applies Requirements without changing behaviour (for example adopting the required theme everywhere) is technical: `--technical --ref requirements/ui#General`.
   The body says *what*, in domain words, not which files to touch.
   **The design link.** When the instruction names a Proposal (the scan follows its approval, and says to link every Task to it), add `--proposal <id>` to every Task you file, so the Board shows the Tasks of one design together. When it names several Proposals, link each Task to the **most recent** of them (the last in the instruction's order) whose scan scope contains one of the Task's references or an element that contains it (`order` contains `order/Paid` and `order/Paid/user.CANCEL`); a Task that only satisfies a Requirement goes to the most recent whose scope lists that Requirement section or its Area. File Tasks with no `--proposal` when the instruction names no Proposal (a scan the developer started by hand).
7. **File each Drift exactly once, in one of two ways.** `trama drift new` always creates a new card, so decide which way applies before running it.
  - **Ordinary Drift** (the default): first re-read the code at the place you will cite in `--where`, and file only if that code really does what `--happens` says. Then `trama drift new "<title>" --ref <nearest Model element or Requirement> --happens "<what the code does, in terms of behaviour>" --should "<what the Model or Requirement says>" --option "<title of the way you recommend>" --option-text "<what it changes and costs>" --option "<title of another way>" --option-text "<…>" [up to five] --where "<where in the code you saw it>" [--critical when a developer decision is urgently needed]`. Pass `--critical` only when the developer urgently needs to take a position on this case; severity or technical complexity alone is not enough. Otherwise omit it. The two texts, the options and `--where` are required; `--where` is the only place for code locations. Write them as described in "Writing a Drift". Do not pass `--task`: a Drift filed by a Scan has no origin Task. Do not choose the resolution.
  - **Drift with a Proposal**, only when the code handles an important case the Model forgot: first re-read the code at the place you will cite in `--where`, and announce only the Drift, then begin the Proposal by following the `trama-design` skill without its interview: `trama proposal new … --announcement <id of the Drift's announcement>`, then `edit`, write the files (list your choices in the Proposal body). If the submission warns that a Requirement fragment the Proposal writes into is larger than 12 KB, split it in the same Proposal, as `trama-design` describes under "Good Requirement habits". Do not submit yet: run `trama drift new … --proposal <id of the Draft> --announcement <id>` once, with the same texts, options and `--where`, adding `--critical` only when the developer urgently needs to take a position on the case (not for severity or complexity alone), and right after it run `trama proposal submit <id>`. If the submission is refused, correct the Proposal with `trama proposal edit <id>`, then submit again. Never run `drift new` a second time for the same difference.
  - Give the Drift a short title (see Naming cards).
  - **Drift without Fix options, with a Proposal**, when no fix of the code respects the Model and the Requirements together (for example, two Requirements contradict each other): the same steps as above, but the Drift takes no `--option`, and its Proposal repairs the Model or the Requirements. Pass `--proposal` and `--where`, and omit every `--option`; a Drift without Fix options is refused without a Proposal.

   Do not open a Proposal for small differences: the default is that the code gets fixed.
8. **Report.** Give the count of Machines compared (every Machine in the scope, each one compared directly, by you or by a sub-agent) and the count of those that produced at least one Task or Drift. List the Tasks and Drifts you and your sub-agents created with their IDs, Machines you could not find any code for, and Model warnings from `analyze`. Say which Drifts need a decision. Then stop, unless the instruction goes on with more work after the scan.

## Judgement

- Unsure whether code is a Drift or only an implementation detail? Ask: would drawing it change the Diagram? If not, skip it.
- If you cannot tell whether the code implements a Transition, say so in the report instead of guessing a Task or a Drift.
- **No code at all is an answer, not a blocker.** If, after step 4, the project has no source files (only `.trama/`, agent skill folders and editor or tool settings), it is a greenfield: the whole Model is still to be built. Do not stop and ask where the code lives. Treat every State and Transition as missing and go to step 6: skip what an open or in-progress Task already covers, then file one Task per coherent unit (usually one per Machine, or per group of States if the Machine is large), each with a `--ref` for every State and Transition it covers and for the Requirement sections attached to them. If the `tech` Area or other General Requirements ask for setup (framework, project structure), file that first as a technical Task referencing them. Say in the report that the project had no code. A Drift needs code to differ from, so file none, and list existing Drifts whose code paths do not exist so the developer can dismiss them.
- Ask only when you truly cannot tell whether code exists, for example because the sources may live in another repository, and only when the scan was asked by hand: then ask with `trama ask`, as the "Asking" section of `trama-design` says. Inside a Run (the pre-flight or the end-of-run scan of `trama-implement`, manual or automatic) never ask: write the doubt in the report and do not wait for an answer.

## Writing a Drift

The developer reads a Drift at a glance, as a programmer, but not as a code review. Write the two sides, and the fix options, at the level of behaviour.

- **Say what the System does and what it should do**, in the words of the domain ("the cart total ignores the coupon"), not how the code does it.
- **Name no variable, function, class, field or file** in `--happens`, `--should` or the options, unless the difference cannot be understood without it. Then name only the one or two that matter, as `inline code`.
- **Code locations go only in `--where`**, which is required for every Drift: the files, and the code element when it helps. Re-read that code before filing; no line numbers, which go stale, and no long pieces of code.
- **Give two to five fix options**, the one you recommend first: each `--option "<title>"` is followed by its `--option-text "<text>"`. Each is a different way to reach what should happen, not a step of one plan, and says in terms of behaviour what changes and what it costs. About 60 words each, short Markdown, no headings or tables inside an option. Titles differ. A Drift filed with fewer than two, more than five, or an option missing its title or text is refused.
- **Fix options reach what should happen** without changing the Model or any Requirement, and respect every Requirement that applies to the elements of the Drift, not only those it names. An option that asks for an exception to, or a change of, the Model or a Requirement is not a fix option: that way goes to a Drift with a Proposal.
- **Use short Markdown:** short paragraphs, a bulleted list when there are several separate points, **bold** for the one or two terms that carry the difference. No headings inside a section, no tables, about 100 words per side.

## Experimental Drift blocker

This section applies only when the instruction says "The experimental Drift blocker is on". Without that sentence, never name a Task in `--not-blocking`, and skip this section.

When it applies, do this before each `trama drift new`:

1. Ask for the candidates with the references and origin you will file with: `trama drift candidates --ref <ref>… [--task <origin>]`. It lists the Tasks that Drift would block, the origin included, and writes nothing. If it lists none, file the Drift as usual. A Drift that a Machine's comparison files gets its candidates from `trama compare brief <machine> --candidates` instead, as `trama-compare` describes.
2. Judge each candidate: does the difference you found touch that Task, its references or what it changes? Leave free only the Tasks the difference does not touch, with a one-line reason for each, in Italian. Judging only removes blocks: never leave free a Task the difference touches, and never name a Task the command did not list.
3. Pass each Task you leave free as `--not-blocking <permanent ID>` followed by `--not-blocking-reason "<reason>"`, in the same order: they pair the way `--option` and `--option-text` do. Pass none when the difference touches every candidate.

The judgement is made once, at filing: a Drift keeps the Tasks it leaves free and blocks every other one, including the Tasks created later about the same thing.

When you start sub-agents for Machines, pass them the sentence "The experimental Drift blocker is on"; they follow the same section of `trama-compare`, and each reports the permanent IDs of the cards it filed and, for each Drift, whether it blocks any Task.

### Final resolution of the Drifts that block nothing

Keep the permanent ID of each Drift you file that blocks no Task: it blocks none when every candidate was left free, or when there was no candidate. Sub-agents report the same, as above.

When the scan is over (after its last step and the end-of-Run scan, if there is one), gather those Drifts into one resolution, unless none is left:

1. Leave out a Drift that is critical or recurring (it follows an earlier Drift). Read the delegation with `trama drift autopilot --json`: if its `status` is `unavailable`, its `mode` is `disabled`, or it cannot be read, the delegation is off; otherwise leave out each non-critical, non-recurring Drift that has a Fix option, because the delegation resolves it on its own. A Drift left out stays open.
2. For each remaining Drift, record the recommended decision: when it has an attached Proposal, `proposal`, and the resolution carries that Proposal's changes as the trama-resolve-drifts skill describes; otherwise `fix-code` with option 1.
3. Announce it with `trama announce proposal "<title>"`, write it with `trama proposal new "<title>" --resolution --non-blocking --announcement <id> --body "<what is resolved and why>"`, and record each decision with `trama proposal resolve-drift <proposal id> <drift id> --decision <decision> [--option 1]`. Hand it over with `trama proposal submit <id>` and read its output, without `trama validate --proposal` or `trama proposal show` before it.

Never approve or reject this resolution, and never start a Run because of it: the developer decides it, as any manual resolution.

## Autopilot coordination

- A scan started by Trama is part of the project-wide autopilot barrier, whether it scans the System, a Feature, or is the selective end-of-Run scan. Do not treat the global last-scan record as proof that all scans have finished.
- A standalone scan is a tracked check: announce it with `trama announce check "<title>" --phase scanning` before reading code, then report its outcome with `trama announce done <id>` on success or `trama announce done <id> --failed` on failure/interruption, before the report. For an autopilot-owned job, pass its explicit `--job <id>` when the host supplied one. A successful check announcement does not itself finish the scan job; let the normal job lifecycle finish it.
- Inside a `trama-implement` Run, use that Run's existing check; do not create another. Sub-agents never announce checks.
- Scanning or importing does not authorize resolving any Drift. The autopilot may later select an eligible open Drift, including one filed by a scan or import, but only its separately authorized `trama-resolve-drifts` work can prepare a resolution.

## PowerShell

The examples use POSIX syntax. In PowerShell, pass JSON on standard input with a pipe, for example `Get-Content -Raw round.json | trama ask --root <project>`, not `<`. On Windows PowerShell 5.1, set `$OutputEncoding` and `[Console]::OutputEncoding` to UTF-8 first, or non-ASCII characters arrive as `?`. Write `--body` and `--reason` values in single quotes, because PowerShell expands `$` and the backtick inside double quotes.
