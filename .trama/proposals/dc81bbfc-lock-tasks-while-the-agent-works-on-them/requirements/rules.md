---
description: "Use when implementing calculations, limits, policies or other business rules behind the Model's conditions and consequences."
---
# Business rules

## General

## task
- A Task that is not technical must reference at least one Model element, and may add Requirements. A Technical Task must reference no Model element, only Requirements if any. Every reference must resolve to an existing Model element or Requirement section when the Task is created.
- Any move between the three columns is allowed, in either direction. The Board refuses dropping a card on the To decide column or on the column it already is in.
- A Task may be linked to a Proposal when it is created; the Proposal must exist, in any status. Tasks that carry no link are never grouped.
- Design grouping: the Tasks linked to the same Proposal form one design, listed in the order they were created. A design with fewer than two Tasks is not shown as a group. The column of a design is derived: To do when every Task is in To do, Done when every Task is in Done, In progress in every other case (including a mix of To do and Done).
- Implementing a design asks the agent to work only on that design's Tasks still in To do, in order, one after the other, stopping at the first Drift it files. The action is not available when the design has no Task in To do.
- The agent takes a Task when it moves it to In progress with its tools, or with the command line run in the terminal Trama started for the agent (the one marked with `TRAMA_AGENT`). A move by the developer never takes a Task, and neither does a move made by an agent outside that terminal, which cannot be told from the developer's. Moving a taken Task to To do or Done, by the agent, clears the mark; moving it to In progress again keeps it.
- A Task taken by the agent cannot be moved by the developer: not with the Board's arrows or drag, not with the move message the Board sends the editor, and not with the command line run without `TRAMA_AGENT`. The refusal says the agent is working on it and points to Take back. Moves by the agent are always allowed.
- Taking a Task back is a decision of the developer: it clears the mark, leaves the Task In progress and is refused to an agent. It has a command, `task take-back <id>`, refused when `TRAMA_AGENT` is set, and a button on the Task's card.
- When the command running in the agent terminal ends, every Task that carries the mark is released; the Task stays where it is. A Task is not released if the terminal cannot report that a command ended.
- Run all To do is unavailable while any Task is taken by the agent. Run this design is unavailable while any Task of that design is taken.

## drift
- A Drift must reference at least one Model element or Requirement, and every reference must resolve when it is created. It may only be resolved once: resolving an already resolved Drift is refused.
- Fixing the code creates a Task titled "Fix code to match the Model: <Drift title>" (or "…the Requirements: …" when the Drift points only to Requirements), pointing to the Drift's references, linked to the Drift, with the Drift's description as its body. It is a Technical Task exactly when the Drift points only to Requirements.
- Accepting the attached Proposal is refused when the Drift has none.

## proposal
- A Proposal may only require Proposals that exist and were not rejected when it is created. Required Proposals are applied under it in dependency order (each after the ones it requires) before it is drawn, diffed, checked for staleness or validated; approving a required Proposal therefore does not make it stale.
- A touched file is stale when its current content (on top of the required Proposals) differs from the hash recorded in `base`, or when it was recorded as new and now exists. A deleted file counts as touched.
- Editing a file of an open Proposal again changes nothing; marking for deletion a file the Proposal already holds a copy of is refused; only open Proposals can be edited, approved or rejected.
- Rejecting needs feedback text.

## proposal/Approved
- After an ordinary (not import) Proposal is approved, the Features to scan are those whose code it can affect: a changed Machine file or Feature description affects its own Feature; a changed Actor file affects every Feature with a Machine that reacts to that Actor's Events, before or after; the System description affects none. For Requirements, a change to an Area's description, its introductory text or its General section affects every Feature; a change to another section affects the Features of the element it names, before or after. Only Features that still exist after the approval are scanned, all in one agent run.

## agent-terminal
- The instruction sent to the agent is one line naming a skill: design → "Use the trama-design skill. <the developer's request>" (the request is asked for in an input box when the button did not carry one; an empty request sends nothing); scan of the whole System → "Use the trama-scan skill on the whole System."; scan of Features → "Use the trama-scan skill on the Feature `a`." or "…on the Features `a`, `b`."; implement → "Use the trama-implement skill on Task <id>."; implement all → "Use the trama-implement skill on every Task in the \"todo\" column, in order, one after the other. Stop at the first Drift you file."; implement a design → "Use the trama-implement skill on every Task of Proposal <id> that is in the \"todo\" column, in order, one after the other. Stop at the first Drift you file."; import → "Use the trama-import skill on this repository."
- A scan of a Feature that does not exist in the Model is refused; an implement request is refused unless the Task exists, and an implement-a-design request unless the Proposal exists.
- Automatic scanning after an approval uses the same scan instruction, with every affected Feature in one run, followed by a sentence naming the approved Proposal and asking that every Task the scan files is linked to it. It needs the setting on, a configured agent command (or the chat launcher) and at least one affected Feature. A scan the developer starts by hand names no Proposal, so its Tasks belong to no design.

## project
- Initializing creates, under `.trama/`: `model/system.md` (H1 is the folder name with dashes and underscores turned into spaces and the first letter capitalised, followed by a placeholder sentence), `model/actors/`, `requirements/` with five Areas that each have a description and an empty General section — `ui` (Interface), `tech` (Technology and constraints), `quality` (Quality), `data` (Data), `rules` (Business rules) — and `proposals/`, `tasks/` and `drifts/`. It installs the agent skills (trama-design with its format reference, trama-scan, trama-implement, trama-import) into the skills folder, `.agents/skills` by default. It never looks in parent folders.
- It refuses, creating nothing, when `.trama/` already exists, or when a skill file to install exists with different content, unless forced; identical files are not a conflict. The extension forces only after the developer confirms in a modal dialog.
- Updating skills overwrites the shipped skills in the chosen folder, creates the five starting Areas only when there is no `requirements/` folder, and regenerates the Requirement skills.
- A Requirement skill `trama-req-<area>` is generated for every Area that has any text (introduction or a non-empty section); its description is the Area's description and its body lists the introduction and each non-empty section titled by its element reference (`General` for the general one). It is written into every skill folder that already holds `trama-design` among `.agents/skills`, `.claude/skills`, `.github/skills` and the configured folder; files whose content would not change are left alone, and skills of Areas that were deleted or became empty are removed.
