---
column: done
technical: false
refs:
  - diagram/State level/developer.OPEN_STATE_LEVEL
drift: lmb7zzkx
proposal: null
agent: false
created: 2026-10-06T16:35:29.757Z
finished: 2026-10-06T16:35:49.611Z
---
# Fix code to match the Model: Il Task chiede di togliere dal breadcrumb gli Stati contenitori, che il Modello ora prevede

## What happens

Il codice fa già quello che il Modello dice oggi: al livello di uno **Stato annidato** il breadcrumb mostra anche gli Stati che lo contengono, e un clic su uno di essi apre il suo livello.

Il Task, nato dal Drift risolto con «Togliere dal breadcrumb gli Stati contenitori», chiede di **togliere** quella risalita.

## What should happen

Il Modello, dopo l'approvazione della Proposal ol4fdukz («Risalire con il breadcrumb a uno Stato che contiene quello mostrato»), dice che da State level si apre State level per **un sotto-Stato con sotto-Stati, oppure, con il breadcrumb, uno Stato che contiene quello mostrato**.

Togliere gli Stati contenitori dal breadcrumb renderebbe il codice contrario al Modello, quindi il Task non si può fare come è scritto.

## Chosen option

**Chiudere il Task senza cambiare il codice**

Il breadcrumb resta com'è, con gli Stati contenitori, come vuole il Modello approvato. Il Task di correzione non serve più: il developer lo chiude. Nessun costo sul codice; la navigazione negli Stati annidati resta comoda.

## Where in the code

extension/src/webview/diagram/levels.ts (breadcrumb)
