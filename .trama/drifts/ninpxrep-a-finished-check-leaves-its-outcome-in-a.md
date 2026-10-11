---
status: resolved
resolution: fix-code
refs:
  - announcement/Announced
  - requirements/data#announcement
proposal: null
task: 1ons1u0h
origin: null
critical: false
option: 1
note: null
resolvedBy: ej18oyqh
created: 2026-10-11T05:01:46.616Z
---
# A finished check leaves its outcome in a file

## What happens

When the agent closes a check, the command writes a hidden marker file in the announcements folder holding the outcome (done or failed), then deletes the ghost. The editor polls the folder and deletes the marker once read. Two pollers, one for the autopilot and one for the System scan memory, both read and delete these markers, so one can take the marker the other needed.

## What should happen

The outcome is sent over the local channel and does not persist in a new file (data Requirement). The ghost is closed even if the editor is missing, and no success is presumed when delivery is not observed.

## Fix options

### Send the outcome over the local channel

The command sends the outcome to the editor over the local channel like other agent events, and drops the marker file. Removes the race between the two pollers; costs a rework of how the System scan memory learns of a delivery.

### Keep the marker and adopt it in the Requirement

Allow a short-lived marker file in the Requirement, and make a single reader dispatch it to both the autopilot and the scan memory. Smallest change; accepts a file the Requirement now forbids.

## Where in the code

src/core/announcements.ts (check finish, delivered-check reading); extension/src/host/main.ts; extension/src/host/global-scan.ts
