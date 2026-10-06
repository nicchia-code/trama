---
column: done
technical: false
refs:
  - diagram
drift: 0yd67ptr
proposal: null
agent: false
created: 2026-10-06T15:13:07.563Z
finished: 2026-10-06T15:15:53.400Z
---
# Fix code to match the Model: Manca l'Evento per la scelta della Proposal disegnata nel Diagramma

## What happens

Il Diagramma torna al **System level** (o al **Machine level** dallo State level) quando il developer cambia la Proposal disegnata sopra il Modello e ciò che guardava esisteva solo grazie alla Proposal di prima: dal selettore, selezionando un Drift con una Proposal, o seguendo un link a una Proposal.

Il Task chiede di correggere il codice, ma l'opzione scelta sul Drift di origine dice che **il codice resta com'è** e che il comportamento va aggiunto al Modello.

## What should happen

Nel Modello il livello del Diagramma cambia solo con gli zoom del developer e con `workspace.MODEL_CHANGED`; **nessun Evento** rappresenta la scelta della Proposal disegnata, quindi le Transizioni di ripiego scelte dal developer non si possono realizzare senza cambiare il Modello.

Correggere il codice per tenere il livello obbligherebbe invece a decidere cosa mostrare in un livello vuoto, che è l'opzione scartata.

## Chosen option

**Accettare la Proposal con il nuovo Evento**

La Proposal allegata aggiunge l'Evento del developer `CHOOSE_DRAWN_PROPOSAL` e le Transizioni di ripiego (verso System level, o Machine level dallo State level), le stesse di `workspace.MODEL_CHANGED`. Il codice fa già così e non cambia: è l'opzione scelta sul Drift di origine.

## Where in the code

extension/src/webview/diagram/index.ts (compute, selettore della Proposal, selectId, apply), extension/src/webview/diagram/levels.ts (validLevel)
