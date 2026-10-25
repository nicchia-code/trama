---
column: done
technical: false
refs:
  - drift
  - drift/Open/agent.UNIFY_DRIFTS
  - requirements/rules#drift
  - requirements/rules#task
  - requirements/rules#agent.UNIFY_DRIFTS
  - requirements/data#drift
  - requirements/tech#drift
  - requirements/ui#drift
  - requirements/cli#General
drift: null
proposal: t72q0waa
agent: false
created: 2026-10-25T06:36:02.401Z
finished: 2026-10-25T06:43:07.997Z
---
# Drop freed Tasks from Drifts

The Drift Blocker is gone: a Drift no longer carries a list of Tasks it leaves free, and every Drift blocks Tasks by the normal rule. When this Task is done:

- **Blocking.** `computeBlocked` in `src/core/blocking.ts` skips nothing: an open Drift blocks every Task its refs and origin make it block, and a fix-code Drift keeps every not-Done origin waiting for its fix Task. No Task is freed by a per-Drift list.
- **Unify Drifts.** When an agent unifies Drifts, the Tasks the unified Drifts blocked stay blocked by the unified Drift; there is no freed-Task list to merge or carry over.
- **Old files.** A Drift file saved earlier with a `notBlocking` field is still read without a validation error and without migration, but the field is ignored: the Drift blocks those Tasks like any other. Saving no longer writes `notBlocking`. In `src/core/work.ts` remove `NotBlocking`, `DriftData.notBlocking`, `notBlockingField`, the related save cleanup, `FreedTask`, `freedTasks`, `checkNotBlocking`, and the `notBlocking` input of `planDrift`/`newDrift`; drop `notBlocking` from `src/core/snapshot.ts` and `ResolvedDrift` in `src/core/resolution.ts`.
- **CLI.** `trama drift new` (`src/cli/commands/drift.ts`) no longer accepts `notBlocking` (strict schema rejects it; description sentence removed). `trama drift new` with `dryRun`, which previews the Tasks the Drift would block, stays unchanged. `trama comparison move` no longer accepts `notBlocking` on its Drifts (`ComparisonDrift`, `DRIFT_FIELDS`, `driftShape` in `src/core/compare.ts`). `trama comparison new` no longer takes or returns `candidates`, and the briefing (`briefing(...)`, `briefingView` in `src/cli/compare.ts`) loses its `### Candidates` section. `driftSummary` and `driftShowView` in `src/cli/work.ts` lose the freed-Task data and the `## Not blocking` section of `drift show`.
- **UI.** The `Not blocking` rows disappear from the Drift details modal on the Board (`webview/board/cards.tsx` `NotBlocking`, `dialogs.tsx`), from the Drift rows of the resolution yellow card (`webview/board/logic.ts`: `NotBlockingItem`, `notBlockingItems`, `resolvedRows`), and from the Diagram details (`webview/diagram/details.ts`, `webview/diagram/panel.tsx`).
- **Agents.** The Drift blocker sections and every `notBlocking`/`candidates` mention are removed from the skills `trama-compare` (step 1 `candidates`, `### Drift blocker`, `notBlocking` in the JSON example), `trama-implement` (`## Drift blocker` and related lines), `trama-scan` and `trama-import` in `skills/` (installed copies follow via Update skills), from the sub-agent prompts in `src/core/sub-agents.ts` (`trama-analysis`, `trama-implementer`) and from `src/core/advisors.ts` ("without `notBlocking`").
- **Docs and tests.** `docs/cli.md` no longer documents `notBlocking`, `candidates` or the `Not blocking` section; CHANGELOG gets a new entry saying the Drift Blocker was removed and old `notBlocking` fields are ignored (old entries stay as history). Delete `test/not-blocking.test.ts`; update `notBlocking` fixtures and cases in the board-logic, board-render, diagram, drift-compare, frontmatter, resolution and unify-drifts tests, and add a case showing an old `notBlocking` on a Drift is read and frees nothing.
