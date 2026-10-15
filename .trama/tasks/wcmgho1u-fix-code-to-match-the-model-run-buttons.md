---
column: done
technical: false
refs:
  - panel/Board
  - requirements/ui#panel/Board
drift: 7976tyg0
proposal: null
agent: false
created: 2026-10-14T12:07:55.332Z
finished: 2026-10-14T12:13:35.980Z
---
# Fix code to match the Model: Run buttons show only the first reason they are disabled

## What happens

When the Run buttons are disabled for more than one reason, the tooltip names only the first. While Drifts are being resolved or a run is in progress, the reasons about a Task taken by the agent or about every Task in To do being blocked do not show, even when they hold too.

## What should happen

The Board Requirement says that when several reasons hold, the tooltip gives them in this order: Drifts are being resolved, then A run is in progress, then the earlier reasons (a Task taken by the agent, every Task blocked). The Requirement for the work tab says instead that the Drifts reason wins over any other, so the tooltip shows only that one. The two Requirements disagree.

## Chosen option

**Show every reason in the Board's order**

The tooltip lists all the reasons that hold, in the order of the Board Requirement: Drifts being resolved, a run in progress, then the Task taken by the agent and the blocked Tasks. The developer sees everything that blocks the button. Cost: longer tooltips, and the work Requirement must be rewritten to match.

## Where in the code

extension/src/webview/board/index.ts, the Run all To do and Resolve Drifts buttons; extension/src/webview/board/render.ts, the Run this design button
