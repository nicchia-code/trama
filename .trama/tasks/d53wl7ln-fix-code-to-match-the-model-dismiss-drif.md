---
column: done
technical: false
refs:
  - drift/Open/developer.DISMISS_DRIFT
drift: 0jrshahm
proposal: iwham416
agent: false
created: 2026-10-17T11:36:54.234Z
finished: 2026-10-17T11:47:17.446Z
---
# Fix code to match the Model: Dismiss Drift sui Drift archiviati in Copilot non attende la fine del turno

## What happens

Un Drift archiviato dall'agente nella chat di Copilot non viene trattenuto: il pulsante Dismiss Drift resta attivo anche mentre l'agente sta ancora finendo il suo turno. Il rilascio alla fine della conversazione Copilot c'è, ma non trattiene nulla, perché la chat di Copilot non dà un'identità all'agente che archivia il Drift.

## What should happen

Il Model dice che la scheda consegnata da un agente senza terminale riconosciuto aspetta la fine della conversazione Trama in corso dello stesso progetto, se c'è. L'host non sa però se una conversazione Copilot è in corso in un'altra finestra né quale agente ha archiviato il Drift, quindi la regola non si può seguire senza scegliere come riconoscere quella conversazione.

## Chosen option

**Trattenere nella finestra della conversazione**

Il Drift archiviato in una conversazione Copilot resta trattenuto solo nella finestra dove la conversazione è in corso, fino alla sua fine. Richiede di tracciare le conversazioni in corso in Copilot. Dismiss Drift da un'altra finestra resta possibile, quindi la regola è rispettata solo in parte.

## Where in the code

extension/src/host/drift-resolution.ts (driftsFinishing, holdFiledDrift, releaseFiledDrifts); src/cli/commands.ts (drift new: messaggio drift-filed solo se ctx.byAgent); extension/src/host/copilot-chat.ts (il Set conversations non si svuota alla fine).
