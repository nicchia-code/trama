---
created: 2026-10-23T09:20:55.178Z
updated: 2026-10-23T09:20:55.178Z
summary: Run e Run all restano sempre indisponibili mentre un Run di Trama è in corso, senza impostazione; le istruzioni e le skill non chiamano più «experimental» le tre funzioni opzionali.
tasks:
  - ffjgvdmd
  - nn9yool5
cleared:
  ffjgvdmd:
    title: Via Submit While Running
    proposal: 54yy16h2
    tag: Settings edits
    finished: 2026-10-23T09:08:43.693Z
    refs:
      - panel/Board
      - panel/Open/developer.SHOW_BOARD
      - task
      - requirements/rules#task
      - requirements/rules#developer.OPEN_QUICK_TASK
      - requirements/rules#developer.UNIFY_DRIFTS
      - requirements/tech#agent-terminal
      - requirements/ui#agent-terminal
      - requirements/ui#panel/Board
  nn9yool5:
    title: Testi senza «experimental»
    proposal: 54yy16h2
    tag: Settings edits
    finished: 2026-10-23T09:08:38.930Z
    refs:
      - agent-launching
      - agent-terminal
      - drift
      - drift-resolution
      - proposal
      - requirements/rules#agent-terminal
      - requirements/rules#agent-launching
      - requirements/rules#drift-resolution
      - requirements/rules#developer.REWORK_PROPOSAL
      - requirements/tech#drift
      - requirements/tech#work
      - requirements/cli#General
      - requirements/data#proposal
      - requirements/quality#agent-terminal
---
# Impostazioni e testi più semplici

L'impostazione `trama.submitWhileRunning` è rimossa: un valore rimasto è ignorato. Il Drift blocker, la parallel execution e il sub-agents context sharing hanno nelle istruzioni, nelle skill e nei documenti i nomi senza «experimental», con le stesse frasi e lo stesso ordine.
