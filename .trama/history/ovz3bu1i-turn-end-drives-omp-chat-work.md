---
created: 2026-10-24T15:41:22.111Z
updated: 2026-10-24T15:41:22.111Z
summary: In omp Chat the end of a job is omp's answer to the prompt over ACP; the hook, execution check and ghosts follow it, and the ACP connection is hardened.
tasks:
  - z4nrmma6
  - hrhnavfk
  - 106ej5cj
  - 43fzs0jh
  - j7hj288b
  - m810ahe4
  - ndm3a0cy
  - dmk24g32
  - f9g83b1x
  - kih1nwne
  - j6i063tt
  - 8n29o5fw
  - ymzqtz1l
cleared:
  8n29o5fw:
    title: Release claims of ended holders
    proposal: kv1x3wmx
    tag: omp ACP IPC
    finished: 2026-10-24T15:37:39.466Z
    refs:
      - prenotazione-file/Prenotato/omp-acp.TURN_ENDED
      - prenotazione-file/Prenotato/time.CHECK_DUE
  j6i063tt:
    title: Ghosts end with omp turns
    proposal: kv1x3wmx
    tag: omp ACP IPC
    finished: 2026-10-24T15:36:25.410Z
    refs:
      - announcement
      - requirements/rules#announcement
  43fzs0jh:
    title: Turn end ends a refinement
    proposal: kv1x3wmx
    tag: omp ACP IPC
    finished: 2026-10-24T15:32:46.337Z
    refs:
      - raffinamento/Al lavoro/omp-acp.TURN_ENDED
  106ej5cj:
    title: Cards wait for ACP turn end
    proposal: kv1x3wmx
    tag: omp ACP IPC
    finished: 2026-10-24T15:30:08.345Z
    refs:
      - panel/Board
  hrhnavfk:
    title: Turn end ends conversation jobs
    proposal: kv1x3wmx
    tag: omp ACP IPC
    finished: 2026-10-24T15:29:00.759Z
    refs:
      - drift-resolution/Running tasks/omp-acp.TURN_ENDED
      - drift-resolution/Resolving/omp-acp.TURN_ENDED
      - drift-resolution/Unifying/omp-acp.TURN_ENDED
  f9g83b1x:
    title: Remove code of omp-chat-conversation/Agent running/agent-hook.STARTED
    proposal: kv1x3wmx
    tag: omp ACP IPC
    finished: 2026-10-24T15:24:39.983Z
    refs:
      - omp-chat-conversation/Agent running
  dmk24g32:
    title: Remove code of omp-chat-conversation/Agent running/agent-hook.IDLE
    proposal: kv1x3wmx
    tag: omp ACP IPC
    finished: 2026-10-24T15:24:39.288Z
    refs:
      - omp-chat-conversation/Agent running
  ndm3a0cy:
    title: Hook inside ACP conversations
    proposal: kv1x3wmx
    tag: omp ACP IPC
    finished: 2026-10-24T15:24:38.511Z
    refs:
      - agent-hook
      - requirements/tech#agent-hook
  kih1nwne:
    title: Remove code of omp-chat-conversation/Agent running/time.CHECK_DUE
    proposal: kv1x3wmx
    tag: omp ACP IPC
    finished: 2026-10-24T15:24:16.162Z
    refs:
      - omp-chat-conversation/Agent running
  m810ahe4:
    title: Decline forms in job conversations
    proposal: kv1x3wmx
    tag: omp ACP IPC
    finished: 2026-10-24T15:17:55.614Z
    refs:
      - requirements/quality#omp-chat-conversation
  j7hj288b:
    title: ACP connection hardening
    proposal: kv1x3wmx
    tag: omp ACP IPC
    finished: 2026-10-24T15:17:54.914Z
    refs:
      - omp-acp
      - requirements/tech#omp-acp
      - requirements/ui#time
  z4nrmma6:
    title: Conversation work ends on turn end
    proposal: kv1x3wmx
    tag: omp ACP IPC
    finished: 2026-10-24T15:17:54.194Z
    refs:
      - omp-chat-conversation
      - requirements/tech#omp-chat-conversation
      - requirements/tech#omp-chat-conversation/Waiting for the window
  ymzqtz1l:
    title: General identity and ACP limits
    proposal: kv1x3wmx
    tag: omp ACP IPC
    finished: 2026-10-24T15:08:44.533Z
    refs:
      - omp-chat-general
---
# Turn end drives omp Chat work

omp's answer to a job's prompt (`omp-acp.TURN_ENDED`) now ends a Run, resolution, unification and refinement in omp Chat conversations through `endAgentWork`, releases Tasks, claims, ghosts and delivered cards, and the hook no longer reports start or idle there. The ACP connection reports every end, failure and stop with its reason, declines forms in job conversations, and opening a window withdraws only orphan announcements.
