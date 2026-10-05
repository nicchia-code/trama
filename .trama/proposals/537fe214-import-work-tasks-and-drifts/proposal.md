---
status: approved
kind: import
requires:
  - 4986b5ff
base:
  work/feature.md: new
  work/task.md: new
  work/drift.md: new
  requirements/data.md: b7ae9589ed18db2309b7d0637a8e7e76646fd0d634bbed6b8841341bb51069c1
  requirements/rules.md: 15555334c0a5319818f4ba80d9119b8526d61126f1676d44a318e1c7d36af21f
delete: []
created: 1970-01-01T00:00:00.002Z
---
# Import: Work (Tasks and Drifts)

Describes the Board's units of work as they are in the code (src/core/work.ts, src/cli/commands.ts, extension/src/host/controller.ts, extension/src/webview/board): a Task moves between three columns; a Drift is open until the developer resolves it one of three ways.

## Doubts

- Missing case: accepting a Drift whose attached Proposal was meanwhile approved from the Board fails (`src/core/proposals.ts:269`, `requireOpen` refuses an approved Proposal; called from `src/core/work.ts:167-170`), and the Drift stays Open; only fixing the code or dismissing remain. Rejected attached Proposals fail the same way (documented in `docs/uat.md` G8). The Model says the Drift stays Open.
- Looks like a missing case: resolving a Drift as Fix code or Dismiss leaves its attached Proposal open on the Board (`src/core/work.ts:155-171` never touches the Proposal), so a Proposal that the developer implicitly turned down keeps waiting for a decision.
- `moveTask` accepts any column, including the one the Task is already in (`src/core/work.ts:124-131`), while the Board refuses that drop (`extension/src/webview/board/logic.ts`, `dropTarget`). Modelled as the Board's rule; the command line and the agent tools have no such refusal.
- No way to delete a Task or a Drift exists anywhere in the code (no command, tool or Board action); a Drift resolved as Fix code and its Task stay on disk forever. Not determined whether this is intended.
- A Task's references are checked only when it is created (`src/core/work.ts:113-122`); loading it later checks only the technical/non-technical rule (`src/core/work.ts:54-62`). A Task whose referenced State was later renamed or removed still loads, with a dangling reference.
