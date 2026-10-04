---
description: "Use when implementing calculations, limits, policies or other business rules behind the Model's conditions and consequences."
---
# Business rules

## General

## task
- A Task that is not technical must reference at least one Model element, and may add Requirements. A Technical Task must reference no Model element, only Requirements if any. Every reference must resolve to an existing Model element or Requirement section when the Task is created.
- Any move between the three columns is allowed, in either direction. The Board refuses dropping a card on the To decide column or on the column it already is in.

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
- The instruction sent to the agent is one line naming a skill: design → "Use the trama-design skill. <the developer's request>" (the request is asked for in an input box when the button did not carry one; an empty request sends nothing); scan of the whole System → "Use the trama-scan skill on the whole System."; scan of Features → "Use the trama-scan skill on the Feature `a`." or "…on the Features `a`, `b`."; implement → "Use the trama-implement skill on Task <id>."; implement all → "Use the trama-implement skill on every Task in the \"todo\" column, in order, one after the other. Stop at the first Drift you file."; import → "Use the trama-import skill on this repository."
- A scan of a Feature that does not exist in the Model is refused; an implement request is refused unless the Task exists.
- Automatic scanning after an approval uses the same scan instruction, with every affected Feature in one run, and needs the setting on, a configured agent command (or the chat launcher) and at least one affected Feature.
