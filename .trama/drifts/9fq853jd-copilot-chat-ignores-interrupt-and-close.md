---
status: resolved
resolution: proposal
refs:
  - requirements/rules#announcement
  - requirements/tech#announcement
proposal: null
task: null
origin: null
critical: false
option: null
note: null
resolvedBy: qp9tlpmq
created: 2026-10-19T20:36:20.787Z
---
# Copilot chat ignores interrupt and close

## What happens

The Copilot chat hook reports only a prompt and the end of a turn. An editor chat announcement is never withdrawn when its turn is interrupted or its conversation is closed, so it stays waiting until the next stop or the editor's start.

## What should happen

When a Trama conversation of the project is interrupted, its waiting editor chat announcements are withdrawn with the notice; when it is closed, they are withdrawn silently, as the rules require.

## Fix options

### Map Copilot's signals

Map Copilot's interruption and closing signals to the editor-chat events, if the Copilot hooks provide them, and withdraw on them as the rules say.

### Limit the rules to Copilot's signals

Record in the rules that Copilot offers no interruption or close signal, and withdraw its announcements only at the end of a turn and at startup.

## Where in the code

extension/src/host/copilot-chat.ts (CopilotChatEventName); extension/src/host/announcements.ts (onCopilotChat); src/core/copilot-chat.ts (hook names)
