---
description: "Use when defining, storing, validating or showing the information the System keeps and what each piece contains."
---
# Data

## General
- All information lives in files under `.trama/`: `model/` (the Model), `requirements/` (one file per Area), `proposals/`, `tasks/`, `drifts/`. Files are Markdown; Proposals, Tasks and Drifts start with YAML front matter followed by an H1 that is their title and a free prose body.
- Model layout: `model/system.md` (System), `model/actors/<actor>.md` (one per Actor), `model/<feature>/feature.md` and `model/<feature>/<machine>.md`. Features cannot be nested. Only `.md` files are allowed in the Model; files and folders starting with a dot are ignored.
- Features, Machines and Actors share one namespace of IDs. An ID is the folder or file name, kebab-case matching `^[a-z][a-z0-9]*(-[a-z0-9]+)*$`; `system`, `feature`, `actors` and `requirements` are reserved. Event names are `UPPER_SNAKE_CASE` and unique within their owner.
- Proposals, Tasks and Drifts each have their own sequence: the ID is the highest existing number of that kind plus one, zero-padded to four digits. The file (or folder, for Proposals) is named `NNNN-<slug>`, where the slug is the title lowercased, reduced to ASCII letters and digits separated by single dashes, cut to 40 characters, and `untitled` when nothing is left. An ID can be given as `12`, `0012` or the full name.
- A Requirement Area is `requirements/<area>.md`: front matter with a required `description`, one H1 with the Area's title, optional prose that applies to the whole Area, then `## General` and `## <element reference>` sections. A section must name an element of the Model that exists and appear once per file.
- Element references: `order` (Feature, Machine or Actor), `order/Paid` (State, any depth), `order/Paid/user.CANCEL` (Transitions on an Event), `user.CANCEL` (Event). Requirements are referenced as `requirements/<area>` or `requirements/<area>#<section>`, with `#General` for the general section.

## task
- One file `tasks/NNNN-<slug>.md`. Front matter: `column` (`todo`, `doing` or `done`; default `todo`), `technical` (true or false; default false), `refs` (list of element or Requirement references), `drift` (ID of the Drift it resolves, or none). The H1 is the title; the body says what must be true when done, in domain words.
- The Board's To decide column is not a Task column; it shows open Proposals and open Drifts.

## drift
- One file `drifts/NNNN-<slug>.md`. Front matter: `status` (`open` or `resolved`; default `open`), `resolution` (`fix-code`, `proposal` or `dismissed`; none while open), `refs` (list of element or Requirement references), `proposal` (ID of the attached Proposal, or none), `task` (ID of the Task created when resolved as fix-code, or none). The H1 is the title; the body says what the code does, what the Model or Requirement says and where in the code it was seen. A Drift is not part of the Model, so its prose may name code locations.
