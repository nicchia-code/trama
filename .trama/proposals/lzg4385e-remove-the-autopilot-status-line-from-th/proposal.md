---
status: approved
base:
  requirements/ui/work.md: 874427a80fb66ea28760d9f79da3815e18450835d1a432dae4c8ec5a7823b193
delete: []
created: 2026-10-11T04:18:58.665Z
scanScope:
  - ref: requirements/ui#drift-resolution
    reason: changed
---
# Remove the autopilot status line from the Board

La riga di stato dell'autopilota nella barra della Board (per esempio `Drift autopilot: enabled — idle: Waiting for an explicit scan or Resolve Drifts request`) è troppo verbosa: la togliamo.

Decisioni:
- La riga di stato dell'autopilota sparisce dalla barra della Board, in ogni modalità e fase (anche in `disabled`).
- Un caso fallito o escluso dall'autopilota si vede con un badge testuale `autopilot failed` sulla scheda del Drift o sulla scheda o riga del Task, con il motivo nel tooltip e nel nome accessibile.

Assunzioni da verificare:
- Modalità, fase e motivo restano consultabili con `trama drift autopilot`; i motivi di attesa, sospensione e coordinatore indisponibile restano nel tooltip di Resolve Drifts come già previsto. Non si indica più sulla Board che un lavoro gira in un'altra finestra.
