---
status: resolved
resolution: fix-code
refs:
  - drift-resolution/Free/drift-resolution.COLLECTION_STARTED
  - drift-resolution/Resolving/agent-hook.IDLE
  - requirements/tech#drift-resolution
proposal: null
task: gxu5slgl
origin: null
critical: false
option: 1
note: null
resolvedBy: rvgvxbgd
created: 2026-10-11T06:42:00.849Z
---
# The automatic start is retried at every check when the chat cannot take it

## What happens

When the agent is the editor chat and the automatic resolution, or the automatic Run that follows it, cannot be sent by the chat itself, nothing is held back: about every half second the autopilot tries again. In an editor without a self-sending chat the prompt is copied to the clipboard and the clipboard notice appears each time. In Cursor the failure is silent, so the developer is never told. A terminal start that fails shows its error again at each attempt.

## What should happen

In the chat, a fallback to ready text or the clipboard is **not** a successful automation: the existing notice is shown **once** and the autopilot does **not** try again by itself. Only a start refused because a scan, a Run or the mode changed at the last moment releases its reservation and is taken again by the next check.

## Fix options

### Stop after a failed delivery until the developer asks

A start that fails to leave Trama (chat fallback, no editor channel) shows its notice once and holds the autopilot until Resolve Drifts, a developer scan or a setting change. Refused starts stay retried as today. Cost: the autopilot needs a small in-memory hold per project.

### Treat a failed delivery as a failed case

The Drifts of the collection, or the Tasks of the Run, are marked as autopilot failed with the delivery reason, and wait for an explicit request. Reuses the existing failed-case rules and badges. Cost: a temporary chat problem excludes the cases until the developer acts, which the Model's rule for refused starts avoids.

### Never fall back to the clipboard when automatic

An automatic start tries only the self-sending chat and gives up silently when it cannot, as an automatic scan does in Cursor. Cost: no notice and still a retry at every check, so it does not meet the Requirement alone.

## Where in the code

extension/src/host/controller.ts (startAutomaticResolution, startAuthorizedRun); extension/src/host/agent.ts (openChat, launchAgent); extension/src/host/main.ts (400 ms autopilot tick)
