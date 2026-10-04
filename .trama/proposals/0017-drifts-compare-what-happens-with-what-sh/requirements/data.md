---
description: "Use when defining, storing, validating or showing the information the System keeps and what each piece contains."
---
# Data

## General
- Persistent project information lives in files under `.trama/`: `model/` (the Model), `requirements/` (one file per Area), `proposals/`, `tasks/`, `drifts/`. Files are Markdown; Proposals, Tasks and Drifts start with YAML front matter followed by an H1 that is their title and a free prose body. Question rounds and editor-discovery information are transient, not project information.
- Model layout: `model/system.md` (System), `model/actors/<actor>.md` (one per Actor), `model/<feature>/feature.md` and `model/<feature>/<machine>.md`. Features cannot be nested. Only `.md` files are allowed in the Model; files and folders starting with a dot are ignored.
- Features, Machines and Actors share one namespace of IDs. An ID is the folder or file name, kebab-case matching `^[a-z][a-z0-9]*(-[a-z0-9]+)*$`; `system`, `feature`, `actors` and `requirements` are reserved. Event names are `UPPER_SNAKE_CASE` and unique within their owner.
- Proposals, Tasks and Drifts each have their own sequence: the ID is the highest existing number of that kind plus one, zero-padded to four digits. The file (or folder, for Proposals) is named `NNNN-<slug>`, where the slug is the title lowercased, reduced to ASCII letters and digits separated by single dashes, cut to 40 characters, and `untitled` when nothing is left. An ID can be given as `12`, `0012` or the full name.
- A Requirement Area is `requirements/<area>.md`: front matter with a required `description`, one H1 with the Area's title, optional prose that applies to the whole Area, then `## General` and `## <element reference>` sections. A section must name an element of the Model that exists and appear once per file.
- Element references: `order` (Feature, Machine or Actor), `order/Paid` (State, any depth), `order/Paid/user.CANCEL` (Transitions on an Event), `user.CANCEL` (Event). Requirements are referenced as `requirements/<area>` or `requirements/<area>#<section>`, with `#General` for the general section.

## task
- One file `tasks/NNNN-<slug>.md`. Front matter: `column` (`todo`, `doing` or `done`; default `todo`), `technical` (true or false; default false), `refs` (list of element or Requirement references), `drift` (ID of the Drift it resolves, or none), `proposal` (ID of the Proposal, the design, the Task comes from, or none; absent in Tasks written before this field existed), `agent` (true while the agent has taken the Task, false otherwise; default false, so Tasks written before this field existed are free). The H1 is the title; the body says what must be true when done, in domain words.
- The Board's To decide column is not a Task column; it shows open Proposals (never drafts) and open Drifts.

## drift
- One file `drifts/NNNN-<slug>.md`. Front matter: `status` (`open` or `resolved`; default `open`), `resolution` (`fix-code`, `proposal` or `dismissed`; none while open), `refs` (list of element or Requirement references), `proposal` (ID of the attached Proposal, or none; the agent may replace it while the Drift is open), `task` (ID of the Task created when resolved as fix-code, or none), `origin` (ID of the Task the agent was implementing when it filed the Drift, or none; absent in Drifts written before this field existed, which have no origin). The H1 is the title. The body has two sections, in this order: `## What happens`, what the code does today and where in the code it was seen, and `## What should happen`, what the Model or the Requirement says. A Drift is not part of the Model, so its prose may name code locations. `dismissed` means the developer kept the code and no Proposal was attached.
- Resolved Drifts written before the two sections existed keep their free body; they are shown as one block.

## proposal
- One folder `proposals/NNNN-<slug>/` with `proposal.md` and, beside it, a `model/` and a `requirements/` folder holding the full new version of every touched file at the same relative path it has under `.trama/`. Front matter of `proposal.md`: `status` (`draft`, `open`, `approved`, `rejected` or `discarded`; default `open`, so Proposals written before `draft` existed are already handed over; a new Proposal is written with `draft`), `kind` (`change` or `import`; default `change`), `requires` (list of Proposal IDs), `base` (touched path → SHA-256 of the file when the Proposal first touched it, or `new` for a file that did not exist), `delete` (list of paths the Proposal removes).
- The H1 of `proposal.md` is the title; the prose says why. Rejection appends a `## Feedback` section with the developer's text. Staleness is computed, never stored.

## question-round
- The request is a JSON object containing `questions` in presentation order. Each question contains a unique non-empty `id`, non-empty `question`, `options` containing `{label, description}`, a zero-based `recommended` option index and a `multi` boolean.
- A completed round contains one answer per question ID. Each answer identifies whether it was answered or skipped, preserves the original labels of selected options and holds free text when supplied. Multiple-choice answers may include both selected options and free text; skips contain no fabricated answer.
- Initial editor unavailability is a distinct result, not an empty completed round or a collection of skipped answers. Editor loss after admission is a distinct interruption error, identified as `editor-interrupted`, with a message and no answers; it must not be represented as initial editor unavailability. Invalid input is a distinct error with the offending question or field identified.
- Pending questions, navigation position, choices and free answers remain in memory only for the lifetime of their round. Do not write them to `.trama/`, the Board or discovery files.
- Editor-discovery records contain the project identity, window identity, local endpoint and focus recency needed to route requests. Store them outside the repository in user-local runtime storage, never in project-versioned files.
