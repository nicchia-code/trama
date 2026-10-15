---
status: resolved
resolution: fix-code
refs:
  - panel/Board
  - requirements/ui#panel/Board
proposal: null
task: wcmgho1u
origin: null
critical: false
option: 1
note: null
resolvedBy: u4kohteu
created: 2026-10-14T10:11:48.884Z
---
# Run buttons show only the first reason they are disabled

## What happens

When the Run buttons are disabled for more than one reason, the tooltip names only the first. While Drifts are being resolved or a run is in progress, the reasons about a Task taken by the agent or about every Task in To do being blocked do not show, even when they hold too.

## What should happen

The Board Requirement says that when several reasons hold, the tooltip gives them in this order: Drifts are being resolved, then A run is in progress, then the earlier reasons (a Task taken by the agent, every Task blocked). The Requirement for the work tab says instead that the Drifts reason wins over any other, so the tooltip shows only that one. The two Requirements disagree.

## Fix options

### Show every reason in the Board's order

The tooltip lists all the reasons that hold, in the order of the Board Requirement: Drifts being resolved, a run in progress, then the Task taken by the agent and the blocked Tasks. The developer sees everything that blocks the button. Cost: longer tooltips, and the work Requirement must be rewritten to match.

### Keep only the strongest reason

The first reason that holds hides the others, as it does now: while Drifts are being resolved or a run is in progress, the tooltip gives only that one. Cost: the developer does not see the taken Task or the blocked Tasks until the general reason ends. The Board Requirement is rewritten to say so.

## Where in the code

extension/src/webview/board/index.ts, the Run all To do and Resolve Drifts buttons; extension/src/webview/board/render.ts, the Run this design button
