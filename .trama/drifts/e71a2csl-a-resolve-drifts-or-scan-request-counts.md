---
status: resolved
resolution: fix-code
refs:
  - drift-resolution/Free/developer.ASK_AGENT
  - requirements/rules#drift-resolution
proposal: null
task: 3v2uxqah
origin: null
critical: false
option: 1
note: null
resolvedBy: rvgvxbgd
created: 2026-10-11T06:42:01.252Z
---
# A Resolve Drifts or scan request counts as started when its instruction never left Trama

## What happens

When the developer presses Resolve Drifts with a mixed set of Drifts and the manual group's instruction is left in the chat or on the clipboard, the delegation is made operative anyway and the automatic group can start first, before any manual resolution exists. When the developer asks for a scan that is only left in the chat, or names a Feature that does not exist, the Drifts whose question was skipped become eligible again as if a scan had started.

## What should happen

The request acts only when the instruction **really** starts: Resolve Drifts resumes the delegation, and a developer scan makes skipped Drifts judgeable again, only once the instruction is written in the terminal or sent by the chat by itself. Text left in the chat or on the clipboard opens no job, and a mixed set prepares the manual group first.

## Fix options

### Act only after a real send

Resume the delegation and release the skipped Drifts only when the launch reports a real start; a clipboard or confirmation fallback, or a refused Feature, changes nothing. Cost: after a fallback the developer must press the button again once the text is really sent.

### Keep acting on the request, but hold the automatic group

The explicit request still resumes the delegation, but the automatic group waits while the manual group's text is pending. Cost: needs a notion of a pending manual instruction that nothing else tracks.

## Where in the code

extension/src/host/controller.ts (launchAction: resolve-drifts and scan cases, send); extension/src/host/agent.ts (launchAgent result)
