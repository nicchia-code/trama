---
status: approved
base:
  agent-launching/agent-terminal.md: 7a4a8462dff6d868a58accdde89188cfaf21836e18e5a18e44f4c42f40ea21da
  agent-launching/drift-resolution.md: 417fd0208d9b03dd1dafc669d47261ce525e8bc648623488cd89e9f559a77d04
  editor-panel/panel.md: 1e28547372521ec54edd37311838187b3c027edbd10ae0cb5752d9e9b7064922
  model-changes/proposal.md: 755511a076ea79bae37e71cfd97c7e831c5ae47eec2a2f3329f09834b35d60f7
  work/drift.md: 09d99eb6d9d1bf3c1231e24c1add3f063584af6dfdb6109c1b2430d91e143d7f
  requirements/cli/main.md: 1d049efcc79ad3f1e2db2b3c5eb9914fc207d8cc5cb8ef66ef84a7d7c3c1db2a
  requirements/data/proposals.md: 77b8ec9be46f6616fca67188f1925c68fc075da82959d0aeb9444f0a4c8b6935
  requirements/data/work.md: bd8d89b276045e5c75a0db818449e92da56527930fdd20c370c5f54e22df6895
  requirements/quality/agents.md: 8d7b4ab866e80a14a25a2e90499ef7dc84ae2310dcec9ef5d047d97e03e3a5a3
  requirements/rules/agent-terminal.md: 6d81fda3538b5493c091b994bbd81041c581e2c5d4bb799abb336cf3689e3e7b
  requirements/rules/ask-more.md: 6941d6f0555668e67a75b6d7d268067973eed8ead4cec2a62b430c9688e27fd2
  requirements/rules/drift-resolution.md: ca5a1b2a8e0964c3cc47e6a201954a3d0a7752843b3b6fa5a7338eeda602fdd7
  requirements/rules/drifts.md: 5b4ab68de6969e9ecfd1496d2ce2b32b4f7578cd346b673187b425bdc2459c43
  requirements/rules/models.md: 71a11bf9118287a153220970588010db7234643506fceb56d37c2885867a7e0e
  requirements/rules/omp-chat-general.md: 51599965a04ab8dd9c25045bd62506cf477f85a9124a3424100a6adb72d939b1
  requirements/rules/scans.md: dd395475a854f47db7d9f80379a2f0e3f45667e74b7e633866a2b19ad771de76
  requirements/rules/setup-wizard.md: 9a8accda3fb57795f947edc24437a02ffd432e783637b49dfb2af2f454fe9f54
  requirements/rules/tasks.md: a66bea3e6ed0f0221b031bba6c7e5987ae136a68dcd50fff43f6c96f0ca23379
  requirements/rules/unify-drifts.md: ea4d1d2bce7adb2051a533d5eeed071a1c23ba4fc61e8ea35884f5d5e3995296
  requirements/tech/drift-resolution.md: 8664ea10c3db4d74fb4dbffdc9ce076b4c0b9de01bf3905f53dd78a609ec4a24
  requirements/tech/drifts.md: 417fea809dcf18f774688abae932a1f7ea375d09ed3970422a3974ff38c632ed
  requirements/tech/models.md: 9baae6e8fb0299d2f8865ed405b0f4a6bab85f298997a194d2deff019e49dda7
  requirements/tech/settings.md: ae181dc47f69a861cd07a4bce0eb77066804dacb008085c0412d360f9084dbe1
  requirements/tech/sotto-agenti.md: cc837bdd4bbe48f05a504e49a4f9de301fc2d576fa2d2e9b8482c7b5a9d50c9e
  requirements/tech/work.md: a333e97eaebdeaebcfec75a325b0aa0148e777bebfbbfe7d0b7357a87c3cd4fe
  requirements/ui/ask-more.md: b3fe190b3c6ff40e35636067bcc48d087adaacb7b109599080da17d2ec63befe
  requirements/ui/settings-specs.md: ced31db9a0b94337426c6c2c3d551081289c7381dba0bd7fc3238241dfefa8c9
  requirements/ui/setup-wizard.md: 0b6eca87018780b01a5cd96df5154841fe32f565dc4188543b366f520ab8cd0d
  requirements/ui/work.md: d23bdc69c898d9a4a6c833fd7d66587890cc1bdbfe32398d24ac4374b8bd2e54
  requirements/rules/agent-terminal-end.md: new
delete: []
request: 2026-10-25T06-59-52
created: 2026-10-25T06:23:35.897Z
label: Drift Blocker removal
---
# Remove the Drift Blocker

The developer's design request asks to remove the Drift Blocker feature, to turn every advanced feature on by default and to allow logging out of model providers. This Proposal removes the Drift Blocker; the new defaults and the provider logout follow in the Proposals that require it.

## Decisions

- Everything goes: the `trama.driftBlocker` setting, the agent's judgement of which Tasks a new Drift leaves free, the per-Drift list of freed Tasks (CLI, Board, Diagram, `drift show`, Ask more), the end-of-work resolution of Drifts that block nothing with its `blocks nothing` badge, the instruction sentence, the skill sections and the `candidates` of a comparison briefing. Every Drift blocks the Tasks it concerns, as before the feature.
- Files already written by the Drift Blocker are read and ignored: an old list of freed Tasks on a Drift no longer frees anything, an old non-blocking mark on a resolution is ignored, with no validation error and no migration. A leftover `trama.driftBlocker` user setting is neither read nor deleted.
- The dry run of `trama drift new`, which previews the Tasks a new Drift would block, stays.
- The Async Drift Resolver sentence, which was placed right after the Drift Blocker sentence, keeps its place in the order of the instruction's sentences without it.

## Already present

- `panel/Closed/developer.SHOW_SETTINGS` — `extension/src/menu-protocol.ts` `SHOW_COMMANDS` (`trama.showSettings`), `extension/src/host/controller.ts` `openSettings`
- `panel/Open/developer.SHOW_SETTINGS` — `extension/src/menu-protocol.ts` `SHOW_COMMANDS`, `extension/src/host/controller.ts` `openSettings`
- `panel/Closed/developer.OPEN_GUIDED_SETUP` — `extension/src/host/controller.ts` `openSettings` with `guidedSetup`, `extension/src/webview/settings/index.tsx`
- `panel/Open/developer.OPEN_GUIDED_SETUP` — `extension/src/webview/main.tsx` `guidedSetup` → `settings.openGuidedSetup`
- `panel/Closed/developer.SHOW_BOARD` — `extension/src/menu-protocol.ts` `SHOW_COMMANDS` (`trama.showBoard`)
- `panel/Open/developer.SHOW_BOARD` — `extension/src/menu-protocol.ts` `SHOW_COMMANDS` (`trama.showBoard`)
- `panel/Closed/developer.OPEN_GHOST_DETAILS` — `extension/src/host/controller.ts` `openGhostDetails`
- `panel/Open/developer.OPEN_GHOST_DETAILS` — `extension/src/host/controller.ts` `openGhostDetails`
- `panel/Get Started/developer.INITIALIZE_PROJECT` — `extension/src/host/controller.ts` `confirmSetup`
- `panel/Get Started/workspace.MODEL_CHANGED` — `extension/src/host/controller.ts` (snapshot refresh on `.trama/` changes)
- `drift-resolution/Free/developer.UNIFY_DRIFTS` — `extension/src/host/drift-resolution.ts`, `extension/media/unify-drifts.md`
- `requirements/rules#agent-terminal/Agent idle` — moved unchanged from `requirements/rules#agent-terminal` to keep the fragment under 12 KB; `extension/src/host/agent.ts` (end of the run on the hook at rest or the command's end, `configuredAutoExit` → `terminal.dispose()`)
