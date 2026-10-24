---
status: approved
base:
  actors/omp-acp.md: 3cd00afc21d3562758407c2d6eaf4c5348c92085cf5963b05d14f6c61de7c74b
  actors/agent-hook.md: 734c773d862f34aaa467f14d603224ad22718b333fa9fd6f49fe296c5f5f7bb8
  actors/time.md: db7ec5406fe688d98a9a89144c9390055a59568ac8c43ed9be09063ff7246cc4
  agent-launching/omp-chat-conversation.md: e35464843bdd805b6400fbf88dd4fc8183279e0a2bc0108bbac0f3d384c4aae5
  agent-launching/omp-chat-general.md: 7eed0f71cdd9d3b5c71ffde92294744d2b40ba5ce711c638eaed605fd69c8b5f
  agent-launching/feature.md: a842936c46e8fb998be0ab6f0a4fdebb6398560b88ee8e6c9834c40f88ef5902
  agent-launching/drift-resolution.md: 6973ef675748fd4d84316f66870d3737db0339721a442f6bb68e3e855d9985a2
  agent-launching/prenotazione-file.md: 8e2d3edf5bdb507a5c68ea01413f999082252bf3743d7c1fc354ea629dfdd30d
  agent-questions/question-round.md: d67f79c07c971823cd801c35cb9bf817682260cec46c735cbb8b37247c7b4496
  work/announcement.md: e5b4d0365931e368f10ac0c876d81ccc4936e96748bcfa111072a15929ee7c66
  work/task.md: 9c2bc71aa1d510710c9015440619b6385e9589bfdda407c6528276e18b3b21a9
  agent-launching/raffinamento.md: 9cbc018eae38c9bb796d42af4e26152ed37429858207a5111a0246148197f31a
  editor-panel/panel.md: ccd48e027b67b13892ae1dff8fabbd6988b5fd2ed8cd79a818f14420cd0ddebd
  requirements/tech/omp-chat-conversation.md: 1633ee32bb1c7d5560328f9aac38f0b3250dc2fe38d01857d5d597f70deebe4c
  requirements/tech/agent-hooks.md: 830821c797cc7e1f940853fb9cc503f17a2c4ed16ac9c03648daa82556ee2e46
  requirements/tech/execution-check.md: 4e003e23525e79c1fd76edadc919208edf9e697326b6dd7e6befb66d3fdf81b3
  requirements/tech/announcements.md: 53684b920c60e17ef5fd48bed57b3c347145efbb068dd16a0fcdae5b658b8122
  requirements/tech/questions-notices.md: 77ee3d3d1c956269663152ffb60795fb416873723e390f74a3ad7eb81f3ef5e1
  requirements/tech/agent-terminal.md: 9dd79664a451930dc48f31df493876a39b657a61b8f10601bfcf91c09bc1a330
  requirements/tech/models.md: 3c3f56c84d4cbd0417585ff7099ed8de2e43883b664795f8e1c8aa65c72f535d
  requirements/tech/project.md: 453966b0341e4805f566e997d8a6a5bc956b760074bba21fb5ec9d4603d9798e
  requirements/tech/omp-chat-general.md: e7e43553bb549955602394fc4d77e106c0bc3a7c6a1833a2fcfc78848aef1348
  requirements/data/proposals.md: 9db87e16c6cdafde5987818ca8de33fc919b92897ba00741fdf2acf0ba7a96ed
  requirements/data/work.md: 6ce1ebc670b2e69c2d432596c10bd999ae700a5f6d134255d848899bcedfde75
  requirements/data/agents.md: 2c70d769f04a10c3db5dcd71a41fd56836492a3a327610dbdcc6d2264412a1b2
  requirements/rules/tasks.md: 3760a81f3d67c52368ff088cf3031193f1da17c667af7a961ebaab716f377503
  requirements/rules/task-progress.md: fa1858f62a0235ddf238ccce0cebb8adebf948ca6bd0cc71591e08de76e491ab
  requirements/rules/execution-check.md: b351e85fc02ffed06821300cebc18abfd655c26a62ed467e3a6b694036b86cf4
  requirements/rules/announcements.md: cbd59638a8e2e14b70cd0884a11e9093332d5128a282e31b00f5bec85adcd1ff
  requirements/rules/ghost-notes.md: a657cccc51a735e0452c350178c1c392022bb0a3f7486f3d0a00cca5c1d4586c
  requirements/quality/omp-chat.md: 38ab573b57c6b3c2ed9734b96e141f3e096d97aa1462dd5be41162696f51a037
  requirements/quality/agents.md: a488d21c15b35510856fb276518084933f2d9827f597126a713a15cdc3b0b019
  requirements/tech/omp-acp.md: new
  requirements/tech/turn-wait.md: new
  requirements/ui/agents.md: efb6be5e511a0a3a01b0870ebf2921c530a07aa196af2b1a6e35083cd8b4220f
  requirements/ui/questions-notices.md: e392aeffb2529f51d5bedb462c5931ac9fa872c0d74253a72b489a3d235dfbdb
  requirements/tech/omp-chat-resume.md: new
delete: []
request: 2026-10-24T16-08-56
created: 2026-10-24T14:21:23.393Z
label: omp ACP IPC
---
# Stable omp ACP channel

Hardens the inter-process communication between Trama and omp now that omp is the only supported agent and omp Chat runs it over ACP. Keeps the same principles (the agent reaches Trama only through its command line, the editor follows the agent it launched) and removes workarounds left from Cursor, Copilot and older omp versions.

## Decisions
- The omp terminal path (omp Chat off, or ACP start failure) stays as it is; everything below that concerns conversations leaves terminals unchanged unless stated.
- The end of a job conversation's work is omp's answer to the prompt over ACP (with no developer message waiting), not the hook's idle signal; the hook no longer reports idle in conversations.
- The hook no longer reports which process is the agent of a conversation: the process Trama spawned is the agent; the editor records it itself for other windows and reloads.
- omp's own question tool in job conversations is refused by the hook and also declined by the ACP client.
- Question rounds keep the CLI and the editor's local socket, but each round carries the terminal or conversation that asked it; the overlay names it and Trama interrupts the round when that terminal or conversation is stopped, closed or lost.
- Agents not launched by Trama are refused: their rounds answer unavailable, their comparisons are briefed without a ghost, and they cannot take a Task.
- Ghost files are written atomically, under a lock, and an update never recreates a ghost already withdrawn or delivered.
- When a window opens or reloads it withdraws only orphan ghosts: not those of conversations it is about to resume, nor those of terminals or conversations another open window follows.
- Liveness of a Task holder: Trama asks the window that owns it first; when no window owns it, it checks the recorded process, recognised by pid and start time; the record is written under a lock.
- The execution check no longer polls the omp processes of the conversations of its own window: their exit is certain.
- ACP hardening: time limit on the whole opening of a session; a refused prompt ends the job with its reason; failure reasons show the tail of omp's error output; closing cancels the turn, closes the session, then ends omp and the processes it started; a closed connection counts as omp exiting.
- A turn that ends because the model refused or reached its token limit adds a notice at the top of the Board; end of turn and Stop show nothing.
- Trama requires omp 18.12.6 or later; below it says omp must be updated and offers the update, as for a missing omp; the fallbacks for older omp go.
- Leftovers of Cursor, Copilot and older agents are removed: data guards, compatibility reads, Copilot file clean-up, dead acceptance-test rows; the old architecture record naming other agents is marked replaced.

## Assumptions to check
- Ask more and General keep their current end of work (no hook, so no turn end counts for them); only job conversations end on omp's answer.
- The notice for an abnormal turn end also covers the model's request limit and a prompt omp refuses outright.
- A process record written by an earlier version has no start time and counts as gone, so a Task held across the upgrade may be released once.
- A Task file whose holder is `true` or a Cursor-era value is read as a Task nobody holds, instead of an error.
- A round is accepted from a Trama terminal or conversation also after it went idle, as long as it still exists; only agents not launched by Trama are refused.
- `tech#omp-chat-conversation` and `tech#announcement` grew over 12 KB: the ACP connection rules moved to a new fragment `tech/omp-acp.md` and the turn wait of the Board (unchanged text) to `tech/turn-wait.md`.

## Refinement
- Rebased on the Model after the approved Proposals jcvd0ps2 (openable tool calls) and a39vini8 (usage bar beside the model): `omp-chat-conversation` keeps their openable tool-call description, `omp-chat-general` keeps the usage bar below the message field, and `tech#omp-chat-conversation` keeps their three tool-call bullets ("Chiamate senza esito", "Chiamate apribili", the `ToolCall` measurement) in place of the old "Chiamate di sola lettura" bullet; this Proposal's ACP changes are unchanged.
- `tech#omp-chat-conversation` went over 12 KB with both changes: the resumption bullet ("Persistenza per la ripresa", text unchanged) moved to a new fragment `tech/omp-chat-resume.md`, under the section `omp-chat-conversation/Waiting for the window`, which the Task on conversation turn end now also names.

## Already present
- `agent-terminal/Agent running/agent-hook.STARTED` — `extension/src/host/agent.ts` `onAgentStarted` (l.242-248) and `src/core/agent-processes.ts` `writeAgentProcess`; terminals keep it unchanged
- `agent-terminal/Agent running/agent-hook.IDLE` — `extension/src/host/agent.ts` `onAgentIdle` → `finishAgentTerminal` (l.234-294)
- `agent-terminal/Agent running/time.CHECK_DUE` — `extension/src/host/agent.ts` `checkAgentTerminals` (l.306-334) with `src/core/terminal-check.ts` `terminalVerdict`
- `drift-resolution/Running tasks/agent-hook.IDLE` — `extension/src/host/agent.ts` `onAgentIdle` → `finishAgentTerminal` → `endAgentWork` → `endTerminalJobs`
- `drift-resolution/Resolving/agent-hook.IDLE` — `extension/src/host/agent.ts` `onAgentIdle` → `endAgentWork`
- `drift-resolution/Unifying/agent-hook.IDLE` — `extension/src/host/agent.ts` `onAgentIdle` → `endAgentWork`
- `drift-resolution/Running tasks/time.CHECK_DUE` — `extension/src/host/agent.ts` execution check (l.300-325), `reportStoppedFollowing` and abnormal `endAgentWork`; `finishJob` passes `jobAbnormalEnd` to the sequence
- `drift-resolution/Resolving/time.CHECK_DUE` — `extension/src/host/agent.ts` execution check
- `drift-resolution/Unifying/time.CHECK_DUE` — `extension/src/host/agent.ts` execution check
- `drift-resolution/Answering a prepared question/question-round.ROUND_CLOSED` — `extension/src/host/questions.ts` `askHostRound`; a prepared round has no terminal and is interrupted only by the loss of the editor
- `prenotazione-file/Prenotato/agent-hook.IDLE` — `extension/src/host/agent.ts` `endAgentWork` → `releaseClaims` → `releaseTerminalClaims` (`src/core/claims.ts`)
- `prenotazione-file/Prenotato/agent-hook.SOTTO_AGENTE_FINITO` — `extension/src/omp/trama-hook.ts` l.93-105, `agent_end` → `releaseAgentClaims`
- `raffinamento/Al lavoro/agent-hook.IDLE` — `extension/src/host/controller.ts` refine launch with `onEnd` → `endRefinement`, fired from `endAgentWork` → `finishJob`
- `raffinamento/Al lavoro/time.CHECK_DUE` — the execution check in `extension/src/host/agent.ts` ends the refine job, which calls `endRefinement`
- `panel/Closed/developer.SHOW_BOARD` — `extension/src/menu-protocol.ts` `SHOW_COMMANDS["trama.showBoard"]`
- `panel/Open/developer.SHOW_BOARD` — `extension/src/menu-protocol.ts` `SHOW_COMMANDS["trama.showBoard"]`
- `panel/Closed/developer.OPEN_GHOST_DETAILS` — `extension/src/host/controller.ts` `openGhostDetails` (called from `extension/src/host/main.ts` l.49)
- `panel/Open/developer.OPEN_GHOST_DETAILS` — `extension/src/webview/board/index.tsx` `openGhost`, `cards.tsx` l.510
- `panel/Settings/developer.CONFIRM_SETUP` — `extension/src/host/controller.ts` `confirmSetup` (l.289)
- `panel/Settings/developer.CANCEL_SETUP` — `extension/src/webview/wizard/controller.ts`
- `panel/Get Started/developer.INITIALIZE_PROJECT` — `extension/src/host/project.ts` `initializeProject`, called from `extension/src/host/controller.ts` l.321
- `panel/Get Started/workspace.MODEL_CHANGED` — `extension/src/host/controller.ts` project watcher refresh
