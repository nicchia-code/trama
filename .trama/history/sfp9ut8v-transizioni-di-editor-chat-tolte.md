---
created: 2026-10-23T14:34:47.449Z
updated: 2026-10-23T14:34:47.449Z
summary: Dal codice spariscono le Transizioni dell'Actor editor-chat (chiusura della conversazione, agente fermato o interrotto) e la Machine chat-advisor.
tasks:
  - 02dmzns1
  - 2gz2g0qc
  - 2o2k542v
  - 5jmd5eg0
  - 7nnx68cw
  - aiv7hmb3
  - dz2slis2
  - eqonlmv7
  - etw0e5re
  - f46lglcd
  - f7w4uebe
  - gyj5ktx4
  - if3d6gvu
  - k8j19zns
  - kjqrzx35
  - kmp0fy08
  - naa9e73l
  - nndj9i4c
  - nsdwi11v
  - p4g1gkut
  - x21as858
cleared:
  aiv7hmb3:
    title: Remove code of drift-resolution/Unifying/editor-chat.AGENT_STOPPED
    proposal: nr388hz3
    tag: Solo omp
    finished: 2026-10-23T14:21:25.017Z
    refs:
      - drift-resolution/Unifying
  kjqrzx35:
    title: Remove code of drift-resolution/Resolving/editor-chat.AGENT_INTERRUPTED
    proposal: nr388hz3
    tag: Solo omp
    finished: 2026-10-23T14:21:12.782Z
    refs:
      - drift-resolution/Resolving
  5jmd5eg0:
    title: Remove code of announcement/Al lavoro/editor-chat.AGENT_INTERRUPTED
    proposal: nr388hz3
    tag: Solo omp
    finished: 2026-10-23T14:21:10.355Z
    refs:
      - announcement/Al lavoro
  gyj5ktx4:
    title: Remove code of task/Taken by the agent/editor-chat.CONVERSATION_CLOSED
    proposal: nr388hz3
    tag: Solo omp
    finished: 2026-10-23T14:21:10.265Z
    refs:
      - task/Taken by the agent
  2o2k542v:
    title: Remove code of announcement/Al lavoro/editor-chat.CONVERSATION_CLOSED
    proposal: nr388hz3
    tag: Solo omp
    finished: 2026-10-23T14:21:08.957Z
    refs:
      - announcement/Al lavoro
  nsdwi11v:
    title: Remove code of announcement/Announced/editor-chat.AGENT_INTERRUPTED
    proposal: nr388hz3
    tag: Solo omp
    finished: 2026-10-23T14:21:07.474Z
    refs:
      - announcement/Announced
  nndj9i4c:
    title: Remove code of drift-resolution/Unifying/editor-chat.AGENT_INTERRUPTED
    proposal: nr388hz3
    tag: Solo omp
    finished: 2026-10-23T14:21:07.408Z
    refs:
      - drift-resolution/Unifying
  p4g1gkut:
    title: Remove code of task/Taken by the agent/editor-chat.AGENT_STOPPED
    proposal: nr388hz3
    tag: Solo omp
    finished: 2026-10-23T14:21:07.062Z
    refs:
      - task/Taken by the agent
  2gz2g0qc:
    title: Remove code of drift-resolution/Running tasks/editor-chat.CONVERSATION_CLOSED
    proposal: nr388hz3
    tag: Solo omp
    finished: 2026-10-23T14:21:06.106Z
    refs:
      - drift-resolution/Running tasks
  f7w4uebe:
    title: Remove code of drift-resolution/Resolving/editor-chat.CONVERSATION_CLOSED
    proposal: nr388hz3
    tag: Solo omp
    finished: 2026-10-23T14:21:06.069Z
    refs:
      - drift-resolution/Resolving
  etw0e5re:
    title: Remove code of drift-resolution/Resolving/editor-chat.AGENT_STOPPED
    proposal: nr388hz3
    tag: Solo omp
    finished: 2026-10-23T14:21:05.965Z
    refs:
      - drift-resolution/Resolving
  naa9e73l:
    title: Remove code of chat-advisor
    proposal: nr388hz3
    tag: Solo omp
    finished: 2026-10-23T14:21:05.769Z
    refs:
      - agent-launching
  x21as858:
    title: Remove code of drift-resolution/Running tasks/editor-chat.AGENT_INTERRUPTED
    proposal: nr388hz3
    tag: Solo omp
    finished: 2026-10-23T14:21:05.203Z
    refs:
      - drift-resolution/Running tasks
  kmp0fy08:
    title: Remove code of task/Taken by the agent/editor-chat.AGENT_INTERRUPTED
    proposal: nr388hz3
    tag: Solo omp
    finished: 2026-10-23T14:21:04.605Z
    refs:
      - task/Taken by the agent
  02dmzns1:
    title: Remove code of drift-resolution/Unifying/editor-chat.CONVERSATION_CLOSED
    proposal: nr388hz3
    tag: Solo omp
    finished: 2026-10-23T14:21:04.263Z
    refs:
      - drift-resolution/Unifying
  if3d6gvu:
    title: Remove code of announcement/Announced/editor-chat.AGENT_STOPPED
    proposal: nr388hz3
    tag: Solo omp
    finished: 2026-10-23T14:21:04.244Z
    refs:
      - announcement/Announced
  f46lglcd:
    title: Remove code of announcement/Al lavoro/editor-chat.AGENT_STOPPED
    proposal: nr388hz3
    tag: Solo omp
    finished: 2026-10-23T14:21:04.128Z
    refs:
      - announcement/Al lavoro
  dz2slis2:
    title: Remove code of drift-resolution/Running tasks/editor-chat.AGENT_STOPPED
    proposal: nr388hz3
    tag: Solo omp
    finished: 2026-10-23T14:21:03.817Z
    refs:
      - drift-resolution/Running tasks
  7nnx68cw:
    title: Remove code of announcement/Announced/editor-chat.CONVERSATION_CLOSED
    proposal: nr388hz3
    tag: Solo omp
    finished: 2026-10-23T14:21:02.668Z
    refs:
      - announcement/Announced
  eqonlmv7:
    title: Remove code of panel/Closed/developer.SHOW_SETTINGS
    proposal: nr388hz3
    tag: Solo omp
    finished: 2026-10-23T14:07:56.049Z
    refs:
      - panel/Closed
  k8j19zns:
    title: Remove code of agent.ADVISOR_REVIEWED
    proposal: nr388hz3
    tag: Solo omp
    finished: 2026-10-23T14:06:03.395Z
    refs:
      - agent
---
# Transizioni di editor-chat tolte

Le Transizioni `CONVERSATION_CLOSED`, `AGENT_STOPPED` e `AGENT_INTERRUPTED` di Unifying, Running tasks, Resolving, Al lavoro, Announced e Taken by the agent, l'Event `agent.ADVISOR_REVIEWED`, `developer.SHOW_SETTINGS` dalla chat e la Machine chat-advisor non esistono più nel codice. La chiusura di una conversazione di omp Chat resta gestita come chiusura di terminale.
