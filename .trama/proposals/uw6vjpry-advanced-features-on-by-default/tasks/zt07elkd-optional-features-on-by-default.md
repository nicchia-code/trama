---
refs:
  - agent-launching
  - task
  - drift
  - drift-resolution
  - raffinamento
  - proposal
  - panel/Settings
  - requirements/tech#panel/Settings
  - requirements/ui#panel/Settings
  - requirements/ui#agent-launching
  - requirements/rules#agent-launching
  - requirements/quality#agent-launching
  - requirements/rules#work
  - requirements/rules#drift-resolution
  - requirements/tech#drift-resolution
  - requirements/ui#drift-resolution
  - requirements/quality#drift-resolution
  - requirements/rules#raffinamento
  - requirements/tech#raffinamento
  - requirements/ui#raffinamento
  - requirements/tech#developer.CHANGE_SETTING
---

# Optional features on by default

When this Task is done, five optional features are on by default: Advisor Scanner (`trama.advisorScanner`), Parallel Execution (`trama.parallelExecution`), Async Drift Resolver (`trama.asyncDriftResolver`), Sub-agents Context Sharing (`trama.subagentsContextSharing`) and Auto-update Stale Proposals (`trama.autoUpdateStaleProposals`). omp Chat, Intent Tracing and Auto Exit are already on by default and stay so. (The omp Chat approval default is a separate Task.)

## Settings and reading

- In `extension/package.json` the five settings have `"default": true` (today `false`).
- In `extension/src/host/agent.ts`, `configuredAdvisorScanner`, `configuredParallelExecution`, `configuredAsyncDriftResolver`, `configuredSubagentsContextSharing` and `configuredAutoUpdateStaleProposals` read the feature as on unless the user (global) value is exactly `false`: `inspect(...).globalValue !== false`, like `configuredAutoExit`. Never `=== true`: `storedValue` (`settings-schema.ts`) removes a user value equal to the manifest default, so ticking "On" in Settings or the wizard saves nothing and must still read as on. A workspace value still never changes the result. Their doc comments say so.
- An untouched setting is on; an explicit `false` saved earlier stays off. No migration: no stored value is written, rewritten or deleted.
- The wizard (Advanced step, Summary) and the Settings tab show and save the five according to the manifest default; `wizard/logic.ts` (`wizardValue`, `isChanged`) and the Settings tab already take the default from the manifest, so no logic change is expected there, only that they now show "On" for an untouched setting.
- The descriptions of the five settings (manifest and wherever the Settings tab shows them) start with «On (the default):».
- Consequences follow from the existing rules with no new code: every Run gets the advisor (`--advisor --config <overlay>`, `TRAMA_ADVISOR_SCANNER=1`), Run all starts per-model Runs together sharing `maxParallelAgents`, launches get the Async Drift Resolver and Context Sharing instruction sentences, stale Proposals are updated automatically.
- Refine All keeps the disabled reason `Turn on Auto-update Stale Proposals in Settings` (`refinement.ts` `REFINE_ALL_OFF`, `webview/board/logic.ts` `REFINE_ALL_OFF`) for when the setting is explicitly off.

## Tests

Tests that assume absent = off are updated so absent means on, and "off" is mocked as `{ globalValue: false }`: among them `test/host-agent-terminals.test.ts`, `test/settings-schema.test.ts` (checks the defaults are `true`), `test/prepared-resolve-instant.test.ts`, `test/turn-end-jobs.test.ts`, and every mock with `inspect: () => undefined` whose expected instruction strings now include the Parallel/Async/Context sentences and whose Runs gain `--advisor`.

## Docs

`README.md`, `extension/README.md` (today «off by default»), `docs/cli.md` (today «off by default») and `docs/uat.md` (steps Z17, X11, Z2, AA6 that set `"trama.advisorScanner": true` to turn it on) say the five features are on by default and are turned off by setting them to `false`. A new `CHANGELOG.md` entry records the change; older entries stay as history.
