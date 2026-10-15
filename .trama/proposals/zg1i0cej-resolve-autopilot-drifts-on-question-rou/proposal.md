---
status: approved
kind: resolution
automatic: true
drifts:
  - drift: yr2wla8w
    decision: fix-code
    option: 1
  - drift: scmundi6
    decision: fix-code
    option: 1
  - drift: mserz836
    decision: fix-code
    option: 1
  - drift: hed998g4
    decision: fix-code
    option: 1
base: {}
delete: []
created: 2026-10-14T12:38:31.929Z
---
# Resolve autopilot Drifts on question rounds and coordinator

Risoluzione automatica: per ogni Drift autorizzato si sceglie la prima Fix option.

- yr2wla8w – A round asked for a project whose window still holds a round is reported as interrupted, not unavailable: correggere il codice (Answer the new request as unavailable).
- scmundi6 – A window that gets its project back again shows two rounds at once and orphans the first: correggere il codice (Keep the round in progress and queue the new one).
- mserz836 – A Run whose coordinator loses its role leaves its unfinished Tasks without a reason: correggere il codice (Segnare i Task rimasti al momento dell'interruzione).
- hed998g4 – An interrupted pre-flight is recorded as a failed scan only in the window that ran it: correggere il codice (Inoltrare al coordinatore il pre-flight interrotto).
