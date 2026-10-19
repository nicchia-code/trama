---
status: resolved
resolution: proposal
refs:
  - requirements/ui#announcement
  - requirements/rules#announcement
proposal: null
task: null
origin: null
critical: false
option: null
note: null
resolvedBy: qp9tlpmq
created: 2026-10-19T20:36:20.832Z
---
# Drift ghost says Writing the Proposal

## What happens

The ghost of a Drift announcement whose Draft exists shows the phase line "Writing the Proposal" instead of "Writing".

## What should happen

Once the Draft exists, the ghost shows the phase line "Writing", for a Drift announcement too, since its announcement passes to Writing.

## Fix options

### Show Writing

Show "Writing" for every announcement whose Draft exists, Drift announcements included, as the UI rules say.

### Keep the label and add it to the rules

Keep "Writing the Proposal" for Drift announcements and state that label in the UI rules.

## Where in the code

extension/src/webview/board/logic.ts (announcedPhase, around line 580); src/core/snapshot.ts (line 495, phase writing-proposal for a Drift with a Draft)
