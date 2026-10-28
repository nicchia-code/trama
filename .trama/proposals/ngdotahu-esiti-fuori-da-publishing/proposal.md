---
status: discarded
base:
  team/issue.md: 8f912d5aa8f410c59696bb98b89c66544ff84bab5e77e8fb8b1b9c754197939a
delete: []
created: 2026-10-27T07:17:42.396Z
label: Issue publishing
---
# Esiti fuori da Publishing

## Motivo

Il codice oggi accetta che l'agente registri l'esito di una pubblicazione (`agent.RECORD_ISSUE_PUBLISHED` o `agent.RECORD_ISSUE_FAILED`) anche quando l'issue non è in Publishing: un issue Not published passa a Published senza un nuovo tentativo di pubblicazione, e un issue Not published può ricevere un nuovo motivo. Il Model non lo prevede. Questa Proposal rende il Model quello che il codice fa, in modo esplicito, e lascia la regola al developer come decisione (Drift tp41lv93).

## Decisioni

- `issue/Not published`: si aggiungono due Transition dell'agente, che il Model non ha oggi.
- `agent.RECORD_ISSUE_PUBLISHED` da Not published porta a Published: l'agente aveva creato l'issue su GitHub e lo registra dopo che Trama l'aveva già segnato Not published (per esempio dopo `time.CHECK_DUE`).
- `agent.RECORD_ISSUE_FAILED` da Not published resta Not published, con il nuovo motivo.
- Un issue Published non cambia: non si registra di nuovo nessun esito.
- Requirements: nessuna modifica. La regola del comando è già nel Model dell'issue.

## Ipotesi

- Il Model descrive l'esito registrato dall'agente, non la sua causa: per questo le Transition dell'agente restano senza condizioni nuove.
