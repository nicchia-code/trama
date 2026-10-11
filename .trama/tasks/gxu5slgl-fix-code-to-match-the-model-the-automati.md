---
column: done
technical: false
refs:
  - drift-resolution/Free/drift-resolution.COLLECTION_STARTED
  - drift-resolution/Resolving/agent-hook.IDLE
  - requirements/tech#drift-resolution
drift: fndsufvs
proposal: null
agent: false
created: 2026-10-11T06:43:10.828Z
finished: 2026-10-11T06:46:06.362Z
---
# Fix code to match the Model: The automatic start is retried at every check when the chat cannot take it

## What happens

When the agent is the editor chat and the automatic resolution, or the automatic Run that follows it, cannot be sent by the chat itself, nothing is held back: about every half second the autopilot tries again. In an editor without a self-sending chat the prompt is copied to the clipboard and the clipboard notice appears each time. In Cursor the failure is silent, so the developer is never told. A terminal start that fails shows its error again at each attempt.

## What should happen

In the chat, a fallback to ready text or the clipboard is **not** a successful automation: the existing notice is shown **once** and the autopilot does **not** try again by itself. Only a start refused because a scan, a Run or the mode changed at the last moment releases its reservation and is taken again by the next check.

## Chosen option

**Stop after a failed delivery until the developer asks**

A start that fails to leave Trama (chat fallback, no editor channel) shows its notice once and holds the autopilot until Resolve Drifts, a developer scan or a setting change. Refused starts stay retried as today. Cost: the autopilot needs a small in-memory hold per project.

## Where in the code

extension/src/host/controller.ts (startAutomaticResolution, startAuthorizedRun); extension/src/host/agent.ts (openChat, launchAgent); extension/src/host/main.ts (400 ms autopilot tick)
