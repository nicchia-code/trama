---
status: approved
kind: import
requires:
  - 4986b5ff
  - 08b2fdb7
base:
  agent-launching/feature.md: new
  agent-launching/agent-terminal.md: new
  requirements/tech.md: e0889acb46ad73df6c63cfc761811f5ae83a1c157cd9997a4ced6969ec2c1c1a
  requirements/rules.md: 4d785446cbaaf76b5a0dadb5c0fdb201ac15756194e16e61a27ea6fde1762866
delete: []
created: 1970-01-01T00:00:00.004Z
---
# Import: Agent launching

Describes how Trama starts the developer's agent (extension/src/host/agent.ts, prompts.ts, approval.ts, controller.ts): prompts for the four skills, the terminal that is reused only when idle, the chat alternative and the automatic scan after an approval.

## Doubts

- Dead code or missing case: `AgentAction` declares an `import` action (`extension/src/protocol.ts:15`) and the controller launches it (`extension/src/host/controller.ts`, `launchAction`), but the validator of messages from the view has no `import` case (`extension/src/host/messages.ts:15-34`) and would answer "unknown action". Only the command palette command starts an import today; the view has no Import button.
- Looks like a bug: with the chat launcher an agent is always considered ready (`extension/src/host/agent.ts:15`), so the automatic scan after every approval "launches" through `openChat`, which in Cursor or when the chat cannot be opened overwrites the developer's clipboard with the prompt (`extension/src/host/agent.ts:32-33`). Modelled as the code does.
- The agent command the developer types the first time is saved in the user's global settings, not in the project (`extension/src/host/agent.ts:79`), so it applies to every project. `extension/package.json` describes the setting but does not say it is saved globally.
- Behaviour not determined: whether a freshly created terminal already reports shell integration when the next launch checks it (`extension/src/host/agent.ts:83`); if not, no terminal is ever reused. The terminal is also never marked idle when it cannot report command ends (`extension/src/host/agent.ts:89`): it stays Agent running until closed.
- With the terminal launcher and no agent command configured, an approval silently skips the automatic scan (`extension/src/host/approval.ts:27`); the developer is not told why no agent started. This is documented in the `trama.autoScan` setting description, but nothing is shown at approval time.
