---
status: resolved
resolution: fix-code
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
proposal: null
task: 6zjrngnq
origin: null
unifies:
  - g0d81xed
  - w9zg7h1z
  - q5j3k7t7
  - qit8c7gq
  - cpu5lyjc
  - fa0pu7pg
  - 57h5c02q
  - kzs0i9e0
  - 0ywbssdr
  - 69ulvszw
  - b7i4ib4g
  - y9if1wut
option: 3
note: Per ogni drift, propnimi una soluzione con trama question
resolvedBy: 8821y9dx
created: 2026-10-24T20:41:33.319Z
job: 042601e9-e7c0-4420-8102-98fa76f108a2
---
# Twelve code-Model differences

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

## Fix options

### Fix each place directly

One targeted change per difference. **General:** its start uses a version-only reader that takes the program and keeps an unreadable version as too old, leaving the launches' update check untouched; the kept General's close passes its name to the wording and `Close` button of the other conversations; the move into the kept state discards the saved entry; General's folder, and the folder that owns its question rounds, become the panel's choice, kept fixed for the life of the process. **Resolve:** the launch check skips only the "awaits a decision" refusal when the launch comes from an answer, and runs the holding check on every Resolve, with or without feedback or answer, also at send time. **Conversations:** on window close an Ask more that has not received its first message stops its process quickly and goes to Closed, nothing saved; the resume of a working conversation is decided by it being a job, not by the hook, so it gets the continuation message. **Scan count:** the reader of cleared Tasks accepts both identity forms, eight characters or a numbered one. **Wizard:** the installer's end check carries the path on view, as the login already does, while Settings and the missing-omp notice keep the saved path; Next of the omp step is unavailable on a too-old omp with the warning's sentence. **IDs:** reserved names are tested as own entries, as the Windows device-name check does.

### Share one source per rule

As the first option, but where two places repeat one rule they read it from one place, so they cannot drift apart again. **General:** one version reader serves General and the Settings status of omp; one helper gives the close wording to the conversations and to the kept General (its detail line no longer speaks of a job for General); one helper gives the panel's folder to the panel title, the conversations, General's start and the ownership of General's question rounds. **Resolve:** the host refusal and the Board's Resolve reasons use the same check, holding included, so the Board also disables Resolve on a held Drift. **Wizard:** Next of the omp step follows the same "omp answers" rule the Providers section already uses, which counts a too-old omp as not answering. **IDs:** the reserved names become a set (or a table with no inherited keys), read by the only place that checks them. The other differences are fixed as in the first option. Costs a slightly larger refactor touching the panel title and the Board reasons.

### Defer and re-check

Fixes that keep the current pieces in place and add a later step. **General:** its start runs no check of its own and uses the outcome of the last launch check of the window, reading only the version when there is none; the host drops the saved entry when the switch-off arrives with the agent in a turn, before the machine enters kept; close wording and folder as in the first option. **Resolve:** an answer refused because another resolution awaits a decision is kept on the Drift as waiting, and its agent starts once no other resolution awaits a decision; the holding check runs on every Resolve. **Conversations:** an empty Ask more opens in Agent running and goes to Closed on window close, with a guard so it is never saved and the view does not show a working agent; the hook-less resume as in the first option. **Scan count:** cleared lines after the last scan are counted without deduplicating by identity. **Wizard:** an answer for a path other than the one on view triggers a new check of the path on view; Next blocked on a too-old omp. **IDs:** as in the first option. Costs one more state on the Drift and a judged version that may be slightly old.

## Where in the code

General: extension/src/host/omp-chat/general.ts (open, checkOmp call ~281 and too-old error line ~283; close ~177-183 with CLEAR_MESSAGE/CLEAR_DETAIL/CLEAR_BUTTON ~72-74; settings ~162; withdraw effect ~200-205); extension/src/host/agent.ts (generalDeps: folder ~196, checkOmp: checkedOmp ~200; ownsAgentTerminal ~382, first folder as General's root); extension/src/host/omp-launch.ts (checkedOmp, showUpdating); extension/src/host/omp-update.ts (ensureOmpUpdated, checkHolds); extension/src/host/omp-status.ts (ompStatus, version-only reader); extension/src/host/omp-chat/conversations.ts (closeRequested ~245-254, the shared close dialog); src/core/omp-chat-general.ts (transition, ready case on settings with omp Chat off ~97); extension/src/host/main.ts ~115 and extension/src/host/controller.ts projectTitle ~694 (the panel's folder). Resolve: extension/src/host/controller.ts (resolvePrepared ~1401-1429; launchAction refusal() ~1499-1506, `const holding = feedback !== undefined ? resolutionHolding(…) : null`; Board Resolve reasons ~732); src/core/resolution.ts (resolveDriftBlocker, awaitingResolution); src/core/proposals.ts (resolutionHolding). Conversations: extension/src/host/omp-chat/conversations.ts (openHeld ~180-212, idle state ~186; windowClosed ~257-266; resume ~273-306; resumeOne ~308-338); src/core/omp-chat-conversation.ts (conversationStep, idle on editor.WINDOW_CLOSED ~156; resumeDecision ~276-279). Scan System count: src/core/last-scan.ts (clearedSince, line pattern ~72); src/core/clear-done.ts (clearDoneTasks, rememberCleared call). Setup wizard: extension/src/host/controller.ts (installOmp ~412-418, checkAgent ~384-409); extension/src/webview/wizard/controller.ts (installOmp ~224-226, receiveAgentCheck ~202-209); extension/src/protocol.ts ~136 and extension/src/host/messages.ts ~135 (installOmp message); extension/src/webview/wizard/logic.ts (nextBlock case omp ~255-261, ompAnswers ~250, ompTooOldText). Model IDs: src/core/model.ts (claim, `RESERVED_IDS[id]` ~41); src/core/types.ts (RESERVED_IDS ~82, isWindowsDeviceName ~85-90).

## Prepared question

```json
{
  "question": {
    "id": "88lo546l",
    "question": "How should the twelve differences between the code and the Model be closed?",
    "context": "The Drift unifies twelve differences, none in conflict with another:\n\n- **General**: its start checks and updates omp; closing it when kept after omp Chat was switched off asks with the clearing dialog; when kept it keeps its saved session; it runs in the first workspace folder instead of the panel's folder.\n- **Resolve**: an answer to a prepared question that needs the agent is refused, and lost, while another non-prepared resolution awaits a decision; Resolve without feedback, and the agent of an answer, do not check whether a resolution already holds the Drift.\n- **Conversations**: an empty Ask more goes to Waiting for the window instead of Closed when the window closes; a hook-less job conversation that was working comes back at rest after a reload, its Run left in progress.\n- **Scan System count**: a cleared Task with a numbered identity is not counted.\n- **Setup wizard, omp step**: the check after the installer uses the saved omp path, not the one on view; an omp older than the minimum version lets Next go.\n- **Model IDs**: `constructor` is refused as a reserved ID.\n\nThe Model and the Requirements say the opposite of each of these.",
    "options": [
      {
        "label": "Fix each place directly",
        "description": "One targeted code change per difference, each in the place the difference lives.",
        "details": "Smallest changes, each easy to review; rules repeated in two places (General's folder, close wording, Board vs host Resolve checks) stay repeated."
      },
      {
        "label": "Share one source per rule",
        "description": "Same fixes, but repeated rules (folder, close wording, Resolve checks, omp answering) come from one place.",
        "details": "Prevents the same differences from coming back; a slightly larger refactor touching the panel title and the Board's Resolve reasons."
      },
      {
        "label": "Defer and re-check",
        "description": "Keep current pieces and add later steps: reuse the last omp check, keep a refused answer waiting, re-check a mismatched omp path.",
        "details": "Fewer changes to existing flows; adds one waiting state on the Drift, and General may judge a slightly old omp version."
      },
      {
        "label": "Model follows today's code",
        "description": "The Model and the Requirements are changed to describe all twelve behaviours as the code has them today.",
        "details": "No code changes; keeps behaviours the Model calls wrong, such as lost answers, a reserved `constructor` ID and Next with a too-old omp."
      }
    ],
    "recommended": 0,
    "multi": false
  },
  "decisions": [
    {
      "decision": "fix-code",
      "option": 1
    },
    {
      "decision": "fix-code",
      "option": 2
    },
    {
      "decision": "fix-code",
      "option": 3
    },
    {
      "decision": "proposal"
    }
  ],
  "fingerprint": "8896aa5d207c381fe85052f0f65ed790f4e4d060396be07c58983ac734350411",
  "prepared": "2026-10-24T20:43:21.687Z"
}
```
