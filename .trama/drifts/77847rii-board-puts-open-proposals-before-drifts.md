---
status: resolved
resolution: fix-code
refs:
  - panel/Board
  - requirements/ui#panel/Board
proposal: null
task: 5bvevn6z
origin: null
critical: false
option: 2
note: null
resolvedBy: u4kohteu
created: 2026-10-14T10:11:44.829Z
---
# Board puts open Proposals before Drifts in To decide, against creation order

## What happens

The To decide column lists every open Proposal first and only then every open Drift, so a Drift filed before a Proposal still shows below it.

## What should happen

The Requirement for the Board says Proposals, Drifts and Tasks in To decide, To do and In progress stand in creation order, so an older Drift stands above a newer Proposal. The Model says the opposite for To decide: the open Proposals, then the open Drifts. The two sources disagree, and the code follows the Model.

## Fix options

### Keep Proposals first and fix the Requirement

The Board keeps the order of the Model: Proposals, then Drifts. The Requirement is rewritten to say so, with creation order kept inside each kind. No code changes. Cost: an older Drift never stands above a newer Proposal, and the ghosts keep their current place.

### Interleave by creation order and fix the Model

Proposals and Drifts in To decide are sorted together by when they were created, as the Requirement says, and the Model sentence about Drifts coming after Proposals is corrected. Cost: the column changes for existing boards, and the ghosts of Proposals and Drifts must follow the same sequence.

## Where in the code

extension/src/webview/board/logic.ts, buildBoard
