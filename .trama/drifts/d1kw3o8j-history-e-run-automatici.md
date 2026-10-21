---
status: resolved
resolution: dismissed
refs:
  - voce-history
  - requirements/rules#voce-history
proposal: null
task: null
origin: yg5r2sbr
critical: false
option: null
note: null
resolvedBy: 8b8lrw57
created: 2026-10-21T05:44:56.081Z
---
# History e Run automatici

## What happens

The Task says no automatic Run writes History entries "come dice il Model". I did not change code. Step 8 of the implementation skill writes entries at the end of every Run that completed a Task, and I only searched (not verified) that the host/CLI have no other automatic writer. The ghost half of the Task (Updating History in System Activities) needs the System Activities column that does not exist yet.

## What should happen

The Model says the agent writes entries at the end of every Run ("Vale per ogni corsa") and has no exemption for automatic Runs; it says nothing about developer-only Runs. The Drift delegation itself is being removed by other Tasks, so the first half has no Model basis. The ghost half depends on Tasks vtyo7yf3, g91d4sjs and elq7ks00, which reshape the Board columns.

## Fix options

### Keep History for every Run

Treat the first half as already true once the delegation is removed; T37 then only needs the ghost move, done by the Board column Tasks. Close T37 without extra code.

### Change the Model first

If automatic Runs really must not write entries, a Proposal amends voce-history and rules#voce-history, then code follows. Costs a design round.

## Where in the code

skills/trama-implement/SKILL.md (step 8); extension/src/webview/board/logic.ts (GHOST_COLUMN, announcedGhosts)
