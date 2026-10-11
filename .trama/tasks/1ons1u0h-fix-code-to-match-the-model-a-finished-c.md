---
column: done
technical: false
refs:
  - announcement/Announced
  - requirements/data#announcement
drift: ninpxrep
proposal: null
agent: false
created: 2026-10-11T05:07:16.521Z
finished: 2026-10-11T05:16:08.085Z
---
# Fix code to match the Model: A finished check leaves its outcome in a file

## What happens

When the agent closes a check, the command writes a hidden marker file in the announcements folder holding the outcome (done or failed), then deletes the ghost. The editor polls the folder and deletes the marker once read. Two pollers, one for the autopilot and one for the System scan memory, both read and delete these markers, so one can take the marker the other needed.

## What should happen

The outcome is sent over the local channel and does not persist in a new file (data Requirement). The ghost is closed even if the editor is missing, and no success is presumed when delivery is not observed.

## Chosen option

**Send the outcome over the local channel**

The command sends the outcome to the editor over the local channel like other agent events, and drops the marker file. Removes the race between the two pollers; costs a rework of how the System scan memory learns of a delivery.

## Where in the code

src/core/announcements.ts (check finish, delivered-check reading); extension/src/host/main.ts; extension/src/host/global-scan.ts
