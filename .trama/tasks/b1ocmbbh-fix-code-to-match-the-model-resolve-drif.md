---
column: done
technical: false
refs:
  - drift-resolution/Free/developer.ASK_AGENT
  - requirements/rules#drift-resolution
drift: ojunkr29
proposal: null
agent: false
created: 2026-10-11T05:47:15.556Z
finished: 2026-10-11T05:53:18.828Z
---
# Fix code to match the Model: Resolve Drifts sends failed automatic cases back to automatic retry

## What happens

Pressing Resolve Drifts with the delegation on clears the failures recorded for the Drifts. They are then handled as automatic cases again, so the System retries their fixes without a new decision from the developer.

## What should happen

A Drift whose automatic fix failed, or was excluded, gets manual questions when the developer presses Resolve Drifts, even with full delegation. Pressing the button does not make such a case automatically eligible again.

## Chosen option

**Ask the developer manually for failed cases**

On a click, failed and excluded Drifts go to the manual question round, as critical ones do. Automatic retries stop until the developer decides. Cost: one more round when a fix keeps failing.

## Where in the code

extension/src/host/controller.ts (launchAction, split of the open Drifts); extension/src/host/drift-resolution.ts (resumeAutopilot clears the failed cases)
