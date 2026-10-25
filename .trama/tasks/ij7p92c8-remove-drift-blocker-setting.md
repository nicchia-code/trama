---
column: done
technical: false
refs:
  - panel/Board
  - panel/Settings
  - requirements/ui#panel/Settings
  - requirements/tech#panel/Settings
  - requirements/rules#setup-wizard
  - requirements/ui#setup-wizard
drift: null
proposal: t72q0waa
agent: false
created: 2026-10-25T06:36:02.401Z
finished: 2026-10-25T06:40:58.838Z
---
# Remove Drift Blocker setting

The Drift Blocker no longer exists in the editor: every Drift blocks Tasks by the normal rule, and no screen offers or shows the Drift Blocker.

When done:

- The `trama.driftBlocker` setting is gone from the extension manifest (`extension/package.json`) and from `SETTING_GROUPS` in `extension/src/host/settings-schema.ts`. The Settings tab of the panel and the Advanced step of the setup wizard (same component) no longer show it; their Drifts subgroup holds only Advisor Scanner and Async Drift Resolver.
- A leftover `trama.driftBlocker` user value saved earlier is neither read nor deleted by Trama; no migration.
- On the Board, the Drift details modal shows the Drift's refs and its two sides (Model and code), with no Fix options and no list of freed Tasks (the "not blocking" section, `NotBlocking` in `webview/board/cards.tsx`/`dialogs.tsx` and `NotBlockingItem`/`notBlockingItems` in `webview/board/logic.ts`, go away). The Diagram's Drift details (`webview/diagram/details.ts`, `webview/diagram/panel.tsx`) likewise show no freed Tasks. An old `notBlocking` field in a Drift file is ignored and frees nothing, without any validation error.
- Tests are updated accordingly: `settings-schema.test.ts`, `wizard-logic.test.ts`, `wizard-view.test.tsx`, `host-setup-wizard.test.ts`, and the `notBlocking` fixtures of the board and diagram tests.
