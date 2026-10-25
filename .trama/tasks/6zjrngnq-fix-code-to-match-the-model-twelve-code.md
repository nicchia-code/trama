---
column: done
technical: false
refs:
  - requirements/rules#omp-chat-general
  - requirements/tech#omp-chat-general
  - requirements/ui#omp-chat-general
  - omp-chat-general/Kept after switch-off
  - requirements/data#omp-chat-general
  - drift-resolution/Free
  - drift-resolution/Answering a prepared question
  - drift-resolution/Resolving
  - requirements/rules#drift-resolution
  - omp-chat-conversation/Agent running
  - omp-chat-conversation/Closed
  - omp-chat-conversation/Waiting for the window
  - requirements/rules#omp-chat-conversation
  - task/Done
  - setup-wizard/omp
  - requirements/rules#setup-wizard
  - requirements/ui#agent-launching
  - requirements/data#General
drift: 88lo546l
proposal: null
agent: false
created: 2026-10-24T20:44:39.520Z
finished: 2026-10-24T20:53:17.044Z
---
# Fix code to match the Model: Twelve code-Model differences

## What happens

- **General.** Its start runs omp's update check and, when a newer omp exists, updates omp behind a progress notice before its conversation opens (at most once an hour per omp program, a result shared with the job launches). Closing General while it is kept after omp Chat was switched off asks «Clear General and stop its agent?» with a `Clear` button, the clearing dialog. A kept General keeps its saved session until it disappears. General runs in the first workspace folder, even when the Trama project is another folder of a multi-root workspace.
- **Resolve.** An answer to a prepared question that needs the agent is refused while another resolution not born from a prepared question is a Draft or open: the answer is lost and the Drift stays open with its question. Resolve without feedback, and the agent started from an answer, never check whether a Draft or open resolution already holds the Drift, so a second resolution can be written for it.
- **Conversations.** An empty Ask more opens at rest and, when the window closes, goes to Waiting for the window instead of Closed. A job conversation without Trama's hook that was working when the window closed comes back at rest after the reload: no continuation message reaches the agent and its Run stays in progress until the conversation is closed.
- **Scan System count.** A Task with a numbered identity that Clear deletes after the last global scan is remembered but not counted, so the count is one short.
- **Setup wizard, omp step.** When the installer terminal ends, the step checks the saved omp path; with another, unsaved path on view the answer is ignored and the step keeps its earlier outcome. An omp older than the minimum version that answers with models lets Next go; the step only shows the warning.
- **Model IDs.** A Feature, Machine or Actor with the ID `constructor` is refused as a reserved name.

## What should happen

- **General.** Its start only finds omp and reads its version, with the minimum-version check: no update check, no update, no notice; updates stay with the job launches. Closing the kept General uses the close confirmation of the other conversations, named General: «Close General and stop its agent?» with a `Close` button. The saved entry of General is dropped as soon as General stays after the switch-off, so a kept General never resumes. General works in the folder the panel uses: the Trama project folder when one is open, otherwise the first folder.
- **Resolve.** An answer that needs the agent starts it even while other resolutions await a decision; the resolution written from it is born from a prepared question and blocks nothing. Resolve, with or without feedback, and the agent of an answer are refused when the Drift is part of a Draft or open resolution.
- **Conversations.** Every conversation starts in Agent running, and an empty Ask more that the window closes ends at once in Closed, its process stopped. A job conversation that was working when the window closed comes back working, with or without the hook, and continues its work until omp's answer.
- **Scan System count.** Every Task that Clear deletes after the last global scan keeps counting until the next global scan, whatever its identity.
- **Setup wizard, omp step.** When the installer terminal ends, the step checks the path it shows, saved or not. While omp is older than the minimum version, Next is unavailable and says why with the sentence of the warning.
- **Model IDs.** Only `system`, `feature`, `actors` and `requirements` are reserved; `constructor` and every other valid kebab-case ID are accepted.

## Chosen option

**Defer and re-check**

Fixes that keep the current pieces in place and add a later step. **General:** its start runs no check of its own and uses the outcome of the last launch check of the window, reading only the version when there is none; the host drops the saved entry when the switch-off arrives with the agent in a turn, before the machine enters kept; close wording and folder as in the first option. **Resolve:** an answer refused because another resolution awaits a decision is kept on the Drift as waiting, and its agent starts once no other resolution awaits a decision; the holding check runs on every Resolve. **Conversations:** an empty Ask more opens in Agent running and goes to Closed on window close, with a guard so it is never saved and the view does not show a working agent; the hook-less resume as in the first option. **Scan count:** cleared lines after the last scan are counted without deduplicating by identity. **Wizard:** an answer for a path other than the one on view triggers a new check of the path on view; Next blocked on a too-old omp. **IDs:** as in the first option. Costs one more state on the Drift and a judged version that may be slightly old.

## Note

Per ogni drift, propnimi una soluzione con trama question

## Where in the code

General: extension/src/host/omp-chat/general.ts (open, checkOmp call ~281 and too-old error line ~283; close ~177-183 with CLEAR_MESSAGE/CLEAR_DETAIL/CLEAR_BUTTON ~72-74; settings ~162; withdraw effect ~200-205); extension/src/host/agent.ts (generalDeps: folder ~196, checkOmp: checkedOmp ~200; ownsAgentTerminal ~382, first folder as General's root); extension/src/host/omp-launch.ts (checkedOmp, showUpdating); extension/src/host/omp-update.ts (ensureOmpUpdated, checkHolds); extension/src/host/omp-status.ts (ompStatus, version-only reader); extension/src/host/omp-chat/conversations.ts (closeRequested ~245-254, the shared close dialog); src/core/omp-chat-general.ts (transition, ready case on settings with omp Chat off ~97); extension/src/host/main.ts ~115 and extension/src/host/controller.ts projectTitle ~694 (the panel's folder). Resolve: extension/src/host/controller.ts (resolvePrepared ~1401-1429; launchAction refusal() ~1499-1506, `const holding = feedback !== undefined ? resolutionHolding(…) : null`; Board Resolve reasons ~732); src/core/resolution.ts (resolveDriftBlocker, awaitingResolution); src/core/proposals.ts (resolutionHolding). Conversations: extension/src/host/omp-chat/conversations.ts (openHeld ~180-212, idle state ~186; windowClosed ~257-266; resume ~273-306; resumeOne ~308-338); src/core/omp-chat-conversation.ts (conversationStep, idle on editor.WINDOW_CLOSED ~156; resumeDecision ~276-279). Scan System count: src/core/last-scan.ts (clearedSince, line pattern ~72); src/core/clear-done.ts (clearDoneTasks, rememberCleared call). Setup wizard: extension/src/host/controller.ts (installOmp ~412-418, checkAgent ~384-409); extension/src/webview/wizard/controller.ts (installOmp ~224-226, receiveAgentCheck ~202-209); extension/src/protocol.ts ~136 and extension/src/host/messages.ts ~135 (installOmp message); extension/src/webview/wizard/logic.ts (nextBlock case omp ~255-261, ompAnswers ~250, ompTooOldText). Model IDs: src/core/model.ts (claim, `RESERVED_IDS[id]` ~41); src/core/types.ts (RESERVED_IDS ~82, isWindowsDeviceName ~85-90).
