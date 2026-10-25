---
status: approved
requires:
  - t72q0waa
base:
  agent-launching/feature.md: 8bf6207ff288370696620c3b02e7502e1034d78722b38b66b8e9e4b72493ccdb
  agent-launching/drift-resolution.md: 3a6dc1943306c71c35233c00978dfe12eb1a3788c3ecf3c998a98a54fafe501e
  agent-launching/raffinamento.md: a76aed8b49b4a951707b80f032e3c06b547150bb9374a507bf08098387f0fc88
  agent-launching/omp-chat-conversation.md: 2fb7ed535eabc689d99aa2bcba58812fa968f940537de3096d55bc217a1d91b8
  model-changes/proposal.md: 1246a7805418724050bdd90435e30cf04c724a6423058aa0eb962004abfff38b
  editor-panel/panel.md: 8b88f23a2f3c0ddf7d20b097b4858b19f3bc766748bb2e3d9bc29d940d6bc9c4
  work/drift.md: 9d1424eaaeda0d838b9e5274f91caea0c40aef369873f3be016428f5364c5aa2
  work/task.md: ff2faf96df237b515ead9c2d0a6466340294a49b2f6da8b0ff88f273d615d1a6
  requirements/tech/settings.md: 80f29bda96b3ec0eb2ede6db130b2843b069b1d6478852881213d0208f24b762
  requirements/tech/drift-resolution.md: f79707f9b078a63fb1a6d6449e25dd9f0461511ff71b2b24dc775d4b3f290adf
  requirements/tech/raffinamento.md: bd2f3d6fc6e867f84811d5c3831e2515828c631babddbe9572fb083c25cc86e3
  requirements/tech/omp-chat.md: 4742bf933011322c857aebc19c8024127fbb05e2696103f1b33211f1d5a6934a
  requirements/rules/scans.md: 359863e6f68fbebfebda38fa320586950b12dae1fc2f156e3ecd3fe999651a7f
  requirements/rules/models.md: e6ceec66b39411e0288d3786a7a166e1df36edd984aed13b8d7f8c3e47b10191
  requirements/rules/drift-resolution.md: dcdaf33f16fc54c2b50c98d2261b386a593fb2eca8cef982d22bb2521bb0a685
  requirements/rules/raffinamento.md: 0afebd1fbc2912c47a465a9ad72793d9ff883216dc1f80f7575755257df55a87
  requirements/rules/omp-chat.md: 7b84bcf014a473b928bc95af8d79dae9678e4718a40af4083709b9e3452b4c63
  requirements/quality/omp-chat.md: c4480ec1d9e038f7e5dd563e826eac50bb096509861f2c37003c8af202db2182
  requirements/quality/agents.md: 3a7ab5c4993295dd2fcd492cddfd0f39c6997af7f507885afe0fc8a8308daae2
  requirements/quality/main.md: 800badb0d4adfdf0fbe1b74bb79c19b07f99f630b2ec916fc595a2c0a49289af
  requirements/ui/settings-specs.md: 3523b2ad720dfce972f05038d2f22ff35b95041257e8d9d874faa8c289ab5683
  requirements/ui/agents.md: af3bc84c18ae1ab4809853b23df5e8fb216c1a07cfe0f8e4120096b5084bdee3
  requirements/ui/raffinamento.md: 3cfa2bafc126e041022e25d2c4bfc0ea15e2a7aa30e9b37753145f1845a4d036
  requirements/ui/work.md: cc7399614df31c9432ea27ed9ebe3569922a1ee0c1039c40037fae772c0f020d
  requirements/ui/omp-chat-conversation.md: 362c5bb70a62572cf1a51b304f3c52b4e4ca4a4552f33cdd6f0ad05ffcc5a32d
  requirements/tech/optional-defaults.md: new
  requirements/tech/yolo-notice.md: new
  requirements/rules/omp-chat-conversation.md: new
delete: []
created: 2026-10-25T06:23:41.555Z
label: Advanced defaults
---
# Advanced features on by default

The developer's design request asks that every advanced feature is on by default and that Auto Exit is on.

## Decisions

- Advisor Scanner, Async Drift Resolver, Parallel Execution, Sub-agents Context Sharing and Auto-update Stale Proposals become on by default. omp Chat, omp Chat Intent Tracing and Auto Exit are already on by default and stay so.
- A setting the developer never touched is on; only an explicit off turns a feature off, so a developer who had turned it off keeps it off.
- omp Chat approval becomes yolo by default: an absent value means yolo and only an explicit `ask` asks. The quality Requirement accepts the risk.
- A one-time notice tells the developer about it: only a developer on yolo by default (setting absent) sees it, as an editor information message when the first omp Chat conversation (General included) starts, «omp Chat now runs commands without asking (yolo). Change it in Settings.» with Open Settings, and never again for that developer, in any window or project.
- The descriptions of the five settings start with «On (the default):»; the description of omp Chat Approval says `yolo` is the default.

## Already present

- `panel/Closed/developer.SHOW_SETTINGS` — `extension/src/menu-protocol.ts` `SHOW_COMMANDS` (`trama.showSettings`), `extension/src/host/controller.ts` `openSettings`
- `panel/Open/developer.SHOW_SETTINGS` — `extension/src/menu-protocol.ts` `SHOW_COMMANDS`, `extension/src/host/controller.ts` `openSettings`
- `panel/Closed/developer.OPEN_GUIDED_SETUP` — `extension/src/host/controller.ts` `openSettings` with `guidedSetup`, `extension/src/webview/settings/index.tsx`
- `panel/Open/developer.OPEN_GUIDED_SETUP` — `extension/src/webview/main.tsx` `guidedSetup` → `settings.openGuidedSetup`
