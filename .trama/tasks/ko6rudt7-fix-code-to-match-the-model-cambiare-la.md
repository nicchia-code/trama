---
column: done
technical: false
refs:
  - diagram/Feature level
  - diagram/Machine level
  - diagram/State level
drift: 945dcc15
proposal: null
agent: false
created: 2026-10-06T15:00:24.978Z
finished: 2026-10-06T15:16:00.759Z
---
# Fix code to match the Model: Cambiare la Proposal disegnata può cambiare il livello del Diagramma

## What happens

Il Diagramma si sposta a un altro livello anche **senza** che il Modello cambi: quando il developer sceglie nel selettore un'altra Proposal (o **None**), oppure seleziona un Drift che porta con sé una Proposal, il Diagramma ridisegna il Modello senza la Proposal di prima.

Se il livello mostrato esisteva solo grazie a quella Proposal (una Feature, una Machine o uno Stato con sotto-Stati che lei aggiunge), il Diagramma torna al livello System, o al livello Machine per uno Stato.

## What should happen

Nel Modello il livello del Diagramma cambia solo con i comandi di zoom del developer (`OPEN_SYSTEM_LEVEL`, `OPEN_FEATURE_LEVEL`, `OPEN_MACHINE_LEVEL`, `OPEN_STATE_LEVEL`) e, come ripiego, con `workspace.MODEL_CHANGED` quando ciò che si guarda non esiste più.

Nessuna Transizione reagisce al cambio della Proposal disegnata, quindi il livello dovrebbe restare quello che il developer stava guardando.

## Chosen option

**Aggiungere le Transizioni al Modello**

Una Proposal aggiunge al Diagramma le Transizioni di ripiego (verso System level, o Machine level dallo State level) quando il developer cambia la Proposal disegnata e ciò che si guarda non esiste senza di lei. Il codice resta com'è; serve un Evento del developer per la scelta della Proposal. È il comportamento più naturale: un livello vuoto non serve a nessuno.

## Where in the code

extension/src/webview/diagram/index.ts (compute, il cambio del selettore della Proposal, selectId), extension/src/webview/diagram/levels.ts (validLevel)
