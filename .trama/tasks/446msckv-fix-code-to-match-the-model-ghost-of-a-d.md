---
column: done
technical: false
refs:
  - announcement/Announced
  - requirements/tech#announcement
drift: ryovya1u
proposal: null
agent: false
created: 2026-10-11T05:07:16.507Z
finished: 2026-10-11T05:10:44.703Z
---
# Fix code to match the Model: Ghost of a Drift with a Draft shows the Draft's title

## What happens

When the agent starts a Proposal for an announced Drift, the Board's ghost swaps the Drift's title for the title of the Proposal Draft bound to it. The ghost reads as a Proposal title while the card that will arrive is a Drift.

## What should happen

The announcement stays a Drift and keeps the Drift's title; only its phase changes to Writing. The Draft title is never copied onto it (tech Requirement: a Drift announcement bound to a Draft keeps the Drift's title).

## Chosen option

**Show the Drift title for Drift ghosts**

Use the Draft title only for Proposal announcements and always the announced title for Drift ones. Small change; the existing test that expects the Draft title must be updated.

## Where in the code

src/core/snapshot.ts (announcement view); test/announcements.test.ts
