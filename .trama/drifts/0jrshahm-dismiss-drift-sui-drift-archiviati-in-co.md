---
status: resolved
resolution: fix-code
refs:
  - drift/Open/developer.DISMISS_DRIFT
proposal: null
task: d53wl7ln
origin: 0og64u4z
critical: false
option: 1
note: null
resolvedBy: 25k91dh9
created: 2026-10-17T10:49:03.183Z
---
# Dismiss Drift sui Drift archiviati in Copilot non attende la fine del turno

## What happens

Un Drift archiviato dall'agente nella chat di Copilot non viene trattenuto: il pulsante Dismiss Drift resta attivo anche mentre l'agente sta ancora finendo il suo turno. Il rilascio alla fine della conversazione Copilot c'è, ma non trattiene nulla, perché la chat di Copilot non dà un'identità all'agente che archivia il Drift.

## What should happen

Il Model dice che la scheda consegnata da un agente senza terminale riconosciuto aspetta la fine della conversazione Trama in corso dello stesso progetto, se c'è. L'host non sa però se una conversazione Copilot è in corso in un'altra finestra né quale agente ha archiviato il Drift, quindi la regola non si può seguire senza scegliere come riconoscere quella conversazione.

## Fix options

### Trattenere nella finestra della conversazione

Il Drift archiviato in una conversazione Copilot resta trattenuto solo nella finestra dove la conversazione è in corso, fino alla sua fine. Richiede di tracciare le conversazioni in corso in Copilot. Dismiss Drift da un'altra finestra resta possibile, quindi la regola è rispettata solo in parte.

### Trattenere in ogni finestra

Inizio e fine di ogni conversazione Copilot Trama vengono comunicati a tutte le finestre del progetto, e il Drift resta trattenuto ovunque fino alla fine. Rispetta la regola del Model, ma richiede un nuovo messaggio di inizio e più stato condiviso tra finestre.

### Non trattenere i Drift di Copilot

Dismiss Drift resta sempre disponibile per i Drift archiviati in Copilot, e la regola del Model vale solo per terminale e Cursor. Non cambia codice, ma la regola del Model non è rispettata per Copilot.

## Where in the code

extension/src/host/drift-resolution.ts (driftsFinishing, holdFiledDrift, releaseFiledDrifts); src/cli/commands.ts (drift new: messaggio drift-filed solo se ctx.byAgent); extension/src/host/copilot-chat.ts (il Set conversations non si svuota alla fine).
