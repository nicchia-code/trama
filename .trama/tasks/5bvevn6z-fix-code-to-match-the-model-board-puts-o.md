---
column: done
technical: false
refs:
  - panel/Board
  - requirements/ui#panel/Board
drift: 77847rii
proposal: null
agent: false
created: 2026-10-14T12:07:55.325Z
finished: 2026-10-14T12:12:17.376Z
---
# Fix code to match the Model: Board puts open Proposals before Drifts in To decide, against creation order

## What happens

The To decide column lists every open Proposal first and only then every open Drift, so a Drift filed before a Proposal still shows below it.

## What should happen

The Requirement for the Board says Proposals, Drifts and Tasks in To decide, To do and In progress stand in creation order, so an older Drift stands above a newer Proposal. The Model says the opposite for To decide: the open Proposals, then the open Drifts. The two sources disagree, and the code follows the Model.

## Chosen option

**Interleave by creation order and fix the Model**

Proposals and Drifts in To decide are sorted together by when they were created, as the Requirement says, and the Model sentence about Drifts coming after Proposals is corrected. Cost: the column changes for existing boards, and the ghosts of Proposals and Drifts must follow the same sequence.

## Where in the code

extension/src/webview/board/logic.ts, buildBoard
