---
created: 2026-10-22T07:52:26.641Z
updated: 2026-10-22T07:52:26.641Z
summary: Un agente unisce tutti i Drift aperti in un solo Drift Unified, lanciato dalla Board con Unify Drifts e poi risolto con Resolve.
tasks:
  - 2og0i5wm
  - m5g4ke31
  - dvmcf0n0
cleared:
  dvmcf0n0:
    title: Unify Drifts sulla Board
    proposal: l8md4lsg
    tag: Unify Drifts
    finished: 2026-10-22T07:50:20.114Z
    refs:
      - panel/Board
      - panel/Open/developer.SHOW_BOARD
      - requirements/ui#developer.OPEN_QUICK_TASK
      - requirements/ui#developer.UNIFY_DRIFTS
      - requirements/ui#drift-resolution/Unifying
      - requirements/ui#agent.UNIFY_DRIFTS
      - requirements/ui#drift/Unified
      - requirements/tech#developer.OPEN_QUICK_TASK
  2og0i5wm:
    title: Drift unificato nel nucleo
    proposal: l8md4lsg
    tag: Unify Drifts
    finished: 2026-10-22T07:45:51.619Z
    refs:
      - drift
      - drift.UNIFIED
      - agent.UNIFY_DRIFTS
      - proposal/Draft/drift.UNIFIED
      - proposal/Open/drift.UNIFIED
      - requirements/data#drift
      - requirements/data#drift/Unified
      - requirements/data#agent.UNIFY_DRIFTS
      - requirements/rules#agent.UNIFY_DRIFTS
      - requirements/cli#General
      - requirements/cli#agent.UNIFY_DRIFTS
      - requirements/tech#agent.UNIFY_DRIFTS
  m5g4ke31:
    title: Lancio di Unify Drifts
    proposal: l8md4lsg
    tag: Unify Drifts
    finished: 2026-10-22T07:44:36.469Z
    refs:
      - drift-resolution
      - developer.UNIFY_DRIFTS
      - agent-launching
      - agent-terminal
      - editor-chat
      - announcement
      - agent-questions
      - requirements/rules#developer.UNIFY_DRIFTS
      - requirements/rules#agent-terminal
      - requirements/tech#developer.UNIFY_DRIFTS
---
# Unify Drifts

Il nucleo registra un Drift unificato con `unifies` e chiude i Drift uniti nello stato Unified. L'editor lancia l'agente Unify Drifts e ne porta blocchi e annuncio nella Snapshot. La Board offre la voce Unify Drifts nel menu di Add Work Item e mostra il lavoro di unificazione e i Drift Unified.
