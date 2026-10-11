---
status: resolved
resolution: fix-code
refs:
  - announcement/Announced
  - requirements/tech#announcement
proposal: null
task: 446msckv
origin: null
critical: false
option: 1
note: null
resolvedBy: ej18oyqh
created: 2026-10-11T05:01:46.179Z
---
# Ghost of a Drift with a Draft shows the Draft's title

## What happens

When the agent starts a Proposal for an announced Drift, the Board's ghost swaps the Drift's title for the title of the Proposal Draft bound to it. The ghost reads as a Proposal title while the card that will arrive is a Drift.

## What should happen

The announcement stays a Drift and keeps the Drift's title; only its phase changes to Writing. The Draft title is never copied onto it (tech Requirement: a Drift announcement bound to a Draft keeps the Drift's title).

## Fix options

### Show the Drift title for Drift ghosts

Use the Draft title only for Proposal announcements and always the announced title for Drift ones. Small change; the existing test that expects the Draft title must be updated.

### Accept the Draft title and change the Requirement

Keep the code and rewrite the Model and Requirement so a Drift ghost takes the Draft's title. Needs a Proposal; contradicts what the file already stores and what the disk sync keeps.

## Where in the code

src/core/snapshot.ts (announcement view); test/announcements.test.ts
