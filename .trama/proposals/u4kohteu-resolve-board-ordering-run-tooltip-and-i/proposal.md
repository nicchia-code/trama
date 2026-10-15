---
status: approved
kind: resolution
drifts:
  - drift: lty11x1p
    decision: proposal
  - drift: 77847rii
    decision: fix-code
    option: 2
  - drift: 7976tyg0
    decision: fix-code
    option: 1
base:
  editor-panel/panel.md: 037e12e8f22ff8c1c5e58b2a492c80ec0e1077efcbba7f790f9fa0ec0d187171
  requirements/tech/agent-terminal.md: 6f1fa38f55194dc2d96c0c828fd196d7b272eb995ce9220e30277760107b8361
  requirements/ui/board.md: cb40958d44b548668a188a16eea4b188f3211bc680f416d2d8c98dfdb99489c4
  requirements/ui/work.md: 238abd38820fdb6906ec49359e73e2811a9d1b49c73d46fbf6e41c93ce8a944d
delete: []
created: 2026-10-14T12:06:23.157Z
---
# Resolve Board ordering, Run tooltip and idle terminal Drifts

Risolve tre Drift:

- **lty11x1p – Idle agent terminal: Requirement and code disagree on remembering it**: si tiene il comportamento attuale. Con la chiusura automatica spenta, un terminale dell'agente a riposo resta ricordato finché non viene chiuso, e chiuderlo libera i Task presi e ritira gli annunci in attesa. Si riscrive il Requisito tecnico del terminale dell'agente.
- **77847rii – Board puts open Proposals before Drifts in To decide, against creation order**: si corregge il codice (Fix option 2). In To decide Proposal e Drift stanno insieme in ordine di creazione; si corregge il Modello della Board e la regola sul posto dei ghost.
- **7976tyg0 – Run buttons show only the first reason they are disabled**: si corregge il codice (Fix option 1). Il tooltip dei pulsanti Run elenca tutti i motivi che valgono, nell'ordine del Requisito della Board, che lo dice ora in modo esplicito; si riscrive il Requisito di Drift resolution che faceva prevalere il solo motivo dei Drift.
