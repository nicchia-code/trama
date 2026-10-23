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
---
# Transizioni di editor-chat tolte

Le Transizioni `CONVERSATION_CLOSED`, `AGENT_STOPPED` e `AGENT_INTERRUPTED` di Unifying, Running tasks, Resolving, Al lavoro, Announced e Taken by the agent, l'Event `agent.ADVISOR_REVIEWED`, `developer.SHOW_SETTINGS` dalla chat e la Machine chat-advisor non esistono più nel codice. La chiusura di una conversazione di omp Chat resta gestita come chiusura di terminale.
