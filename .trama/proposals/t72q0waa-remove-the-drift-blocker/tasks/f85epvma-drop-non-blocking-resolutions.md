---
refs:
  - proposal
  - requirements/data#proposal
  - drift-resolution/Unifying
  - requirements/rules#drift-resolution
  - requirements/tech#drift-resolution
  - requirements/ui#drift-resolution
  - requirements/rules#developer.UNIFY_DRIFTS
---
# Drop non-blocking resolutions

The Drift Blocker is gone, so a Proposal can no longer be a non-blocking resolution. Every Drift blocks by the normal rule.

When done:

- `trama proposal new` no longer accepts `nonBlocking` (input schema, mapping and description in `src/cli/commands/proposal.ts`; the `--non-blocking needs --resolution` check in `createProposal` and `nonBlockingRule` in `src/core/proposals.ts` are removed). `ProposalData.nonBlocking` no longer exists and `save` never writes it.
- An old Proposal file that still carries `nonBlocking` is read without any validation error and the field is ignored: it is not migrated, not rewritten on purpose, and never shown. The snapshot (`src/core/snapshot.ts`) no longer carries it.
- Nothing shows a non-blocking resolution: no `(blocks nothing)` from `resolvesMark` in `src/cli/work.ts` (so neither `trama project show` nor `trama proposal list` print it), and no `blocks nothing` badge from `proposalBadges` in `extension/src/webview/board/logic.ts`.
- No skill writes a non-blocking resolution (no end-of-work `nonBlocking` step in `skills/`, and the installed copies follow on Update skills).
- With the Async Drift Resolver on, the agent prepares the resolution questions at the end of the work, after the last Drift is filed; there is no `nonBlocking` step before or after it. The Async Drift Resolver sentence ("The Async Drift Resolver is on: before finishing, prepare the resolution question of every Drift filed in this job, as your skill says.") keeps its place on the same line: after the limit sentence, the sub-agents sentences, Parallel Execution and Advisor sentences, before the questions and language sentences; only the Drift Blocker sentence (`DRIFT_BLOCKER_SENTENCE`, `withDriftBlocker` in `extension/src/host/prompts.ts`) disappears from before it.
- Unify Drifts (state Unifying): one agent unites the collected Drifts, asks the developer only about conflicts between them, registers the unified Drift with one `trama drift new` carrying `unifies` and the announcement, and closes the collected Drifts in one step; the unified Drift enters no resolution by itself. Its instructions (`extension/media/unify-drifts.md`, step 7) no longer re-judge which Tasks to leave free (`notBlocking`) and carry no Drift blocker sentence; with the Async Drift Resolver on, the agent still prepares the unified Drift's question at the end.

Tests and docs follow: delete `test/non-blocking-resolution.test.ts`, drop `nonBlocking` fixtures and the Drift-blocker case in `unify-drifts.test.ts`, update `docs/cli.md` and add a CHANGELOG entry.
