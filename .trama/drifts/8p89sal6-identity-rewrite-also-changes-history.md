---
status: resolved
resolution: proposal
refs:
  - requirements/rules#project
proposal: null
task: null
origin: null
critical: false
option: null
note: null
resolvedBy: qp9tlpmq
created: 2026-10-19T20:35:02.309Z
---
# Identity rewrite also changes History

## What happens

The identity rewrite also renumbers the Task references in History entries and in a Drift's non-blocking list, although the Requirement lists only the fields it rewrites and says every other reference stays as it is.

## What should happen

The identity rewrite changes only the references the Requirement lists. History entries and non-blocking entries keep the identities they had.

## Fix options

### Rewrite only the listed fields

The rewrite touches only Proposal, Task and Drift references as the Requirement lists them. History entries and the non-blocking list keep their old identities, so they may cite numbers that no card carries any more. The History text stays as it was written, and the developer reads those references with the old numbering. This matches the Requirement exactly and changes the code only where it renumbers History and the non-blocking list.

### Keep the wider rewrite and name it

The rewrite keeps updating the Task references in History entries and in the non-blocking list, so they keep pointing at the cards they cited. The Requirement then has to list those two places, which changes the Requirement; the developer decides that. Until then the code and the Requirement disagree, and this Drift stays open.

## Where in the code

src/core/rewrite-ids.ts: the Drift loop (non-blocking list) and the History loop (saveHistory)
