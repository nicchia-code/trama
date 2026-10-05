---
name: trama-implement
description: Use when asked to implement, work on or execute a Trama Task (or the next Task in "todo") in a project with a `.trama/` folder. Writes the code so the behaviour matches the Model and the construction follows the Requirements, and stops and files a Drift if either cannot be followed.
---

# Trama: implement

You implement one **Task** so that the code behaves as the **Model** says and is built as the **Requirements** say. The Model wins. If following it or a Requirement is impossible, or you discover it is wrong or incomplete in an important way, you **stop working on that Task** and file a **Drift**: you never silently deviate and you never edit the Model or the Requirements. The Drift blocks the Task and the other Tasks that concern the same thing. Asked for one named Task, you stop there and take no other. Asked for several Tasks (every Task in "todo", or every Task of a design), you go on: the Drift leaves its Task in `doing`, and `trama task next` skips the Tasks it blocks.

## Hand-over

A new Proposal starts as a **Draft**, not approvable. Finish every file, validate and read the changes before `trama proposal submit <id>`. If submission is refused, fix the reported problems, validate and review again, then retry. Only after it succeeds attach it to a Drift and tell the developer to review it. Before every later file change, call `trama proposal edit` again: it returns an open Proposal to Draft, so submit again when finished.

## Announcing cards

When you know you must file a Drift (see "When you must file a Drift"), announce it before you write it up: `trama announce drift "<title>"` prints an announcement ID. Pass it when you file the Drift: `trama drift new … --announcement <id>`; if the Drift carries a Proposal, announce that too and pass its ID to `trama proposal new`. The Board shows a ghost of each card meanwhile. Never wait for a ghost to show and never skip or delay a card because of it; an unknown ID is only noted in the output.

## Hard rules

- NEVER edit `.trama/model/`, `.trama/requirements/` or the generated `trama-req-*` skills.
- NEVER run `trama proposal approve`, `trama proposal reject`, `trama proposal discard` or `trama drift resolve`.
- NEVER implement behaviour that contradicts the Model, or code that contradicts a Requirement, to get something working.
- Do not touch code unrelated to the Task.

## Naming cards

Every live Proposal, Task and Drift has a temporary **short number** (`P3`, `T3`, `D3`) besides its **permanent identity** of eight characters.

- Name cards to the developer by short number and title, for example "Task T3 – title" or "Drift D2 – title", also in the final report. A closed card (for example a Task in Done) has no number: use its permanent identity.
- In every command you run and every file you write (`trama task move`, `--task`, `--proposal`, the body of a Proposal) use **only the permanent identity**, taken from `--json` (field `id`; the number is the field `number`) or from the file name. **Never write a short number in a file**: it changes from one working copy to another.

## Steps

1. **Pick the Task.** Asked for one named Task, use the ID you were given. Asked for several Tasks, take each one from `trama task next`, and with `--proposal <id>` when asked for the Tasks of a design: it prints `Next Task: <id> <title>`, skips the blocked Tasks, moves nothing, and recomputes the answer each time, so a Task that waited for the Task fixing its Drift comes back, after it, once that Task is Done. When its first line says no Task is runnable, the run is over: go to the final check (step 6). Read the Task once, with `trama task show <id>`. That text is the Model and the Requirements for this Task. A Machine reference includes the State tree and the Events with who receives them. A State reference includes the outgoing Transitions, including those inherited from the States that contain it, marked as inherited. An Event reference includes the Transitions that react to it. A reference to a whole Area includes the text of every section. Under `## Requirements` are the Requirements attached to the referenced elements, and every General section that has text, written in full. A Technical Task references no Model element; implement it as a normal engineering task from the Requirements in that text.
2. **Start it.** `trama task move <id> doing`. If the move is refused because the Task is blocked, nothing changed. Asked for one named Task: stop, take no other Task, and report the Task and the Drift (or fix Task) the refusal names; only the developer can decide on that Drift. In a run over several Tasks `trama task next` never names a blocked Task, so a refusal means something changed since you asked: ask `trama task next` again.
3. **Read the code.** The Model and the Requirements for this Task are the `trama task show` text already read. Read the code that implements them and follow its conventions. For this Task, do not run `trama state`, `trama event`, `trama paths`, `trama machine` or `trama requirements`, and do not open a `trama-req-*` skill. If a Transition the Task must implement does not appear in that text, run one command for that Transition, `trama state` or `trama event`, and do not resume the tour.
4. **Implement.** Write the code, including every Transition's condition and consequence exactly as the prose in the Task text says, and the States around it that the Task depends on. Follow every Requirement in that text, including the General sections written there. Add or update tests for the behaviour. While writing, run the tests added or changed for this Task and the existing tests of the behaviour this Task changes. Do not run the project's full suite, the linter or the build after the Task. After the code, do not read the Model again.
5. **Finish the Task.** `trama task move <id> done`. If you were asked for several Tasks, ask `trama task next` again (with the same `--proposal`) and go back to step 1 until it says no Task is runnable.
6. **Check the run, then report.** A Task asked by name is its own run, so this step follows it at once. In a run over several Tasks, this step runs once, after `trama task next` says no Task is runnable. Run the project's tests, linter and build once. If that check fails, fix the code and run it again, without reading the Model again, before the report; leave every Task in the column it is in. If you cannot tell which Task broke the check, say so in the report and stop, without another reading tour. The report says what you implemented, in domain terms, the Drifts you filed (each with its Task), anything you noticed that was outside the Tasks, and the Tasks still in "todo" left unrun, each with the Drift or the fix Task that blocks it, as the last `trama task next` lists them.

## When you must file a Drift

Stop working on the Task at once and file a Drift when any of these is true:

- The Model cannot be implemented as written (contradiction, impossible condition, an Event nothing can emit).
- The Model is silent on a case that the Task forces you to handle, and the choice changes what the user sees or what data is kept.
- Doing the Task right requires a State or Transition the Model does not have.
- A Requirement cannot be followed (it conflicts with the Model, another Requirement, or the platform), or the Task forces a construction choice the Requirements should decide and do not.

Then:

1. Decide which case applies. If the code is right and the Model forgot a case, first create a Proposal with the `trama-design` skill, without its interview (list your choices in the Proposal body). Finish its files, validate, read it and submit it before attaching it to the Drift; correct and retry any refusal. Otherwise there is no Proposal.
2. File the Drift **once**: `trama drift new "<title>" --ref <nearest Model element or Requirement> --task <id of the Task you are implementing> --happens "<what the code does or what you would do instead, in terms of behaviour>" --should "<what the Model or Requirement says and why it cannot be followed>" --option "<title of the way you recommend>" --option-text "<what it changes and costs>" --option "<title of another way>" --option-text "<…>" [up to five] [--where "<where in the code>"]`, adding `--proposal <id>` only in the first case. The two texts and the options are required; `--where` is optional and the only place for code locations. Write them as described in "Writing a Drift". `--task` records the origin: the Drift blocks that Task. `trama drift new` always creates a new card, so never run it twice for the same problem.
3. Leave the Task in `doing`; the developer decides whether the code or the Model changes. Asked for one named Task, stop here. In a run over several Tasks, go on: ask `trama task next` again. The Drift blocks only the Task it was filed for and the Tasks that concern the same thing, and `trama task next` skips those.
4. Report. Say what you implemented and the Drift you filed, with the Task it concerns. In a run over several Tasks this goes into the final report described in step 6 of the steps above, once `trama task next` says no Task is runnable.

Small choices that stay below Diagram level and that no Requirement covers (names, data structures, how an effect is carried out) are yours to make; do not file Drifts for them.

## Writing a Drift

The developer reads a Drift at a glance, as a programmer, but not as a code review. Write the two sides, and the fix options, at the level of behaviour.

- **Say what the System does and what it should do**, in the words of the domain ("the cart total ignores the coupon"), not how the code does it.
- **Name no variable, function, class, field or file** in `--happens`, `--should` or the options, unless the difference cannot be understood without it. Then name only the one or two that matter, as `inline code`.
- **Code locations go only in `--where`**, which is optional: the files, and the code element when it helps. No line numbers, which go stale, and no long pieces of code.
- **Give two to five fix options**, the one you recommend first: each `--option "<title>"` is followed by its `--option-text "<text>"`. Each is a different way to reach what should happen, not a step of one plan, and says in terms of behaviour what changes and what it costs. About 60 words each, short Markdown, no headings or tables inside an option. Titles differ. A Drift filed with fewer than two, more than five, or an option missing its title or text is refused.
- **Use short Markdown:** short paragraphs, a bulleted list when there are several separate points, **bold** for the one or two terms that carry the difference. No headings inside a section, no tables, about 100 words per side.
