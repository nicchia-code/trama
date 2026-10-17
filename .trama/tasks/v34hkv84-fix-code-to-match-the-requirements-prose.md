---
column: done
technical: true
refs:
  - requirements/ui#panel
drift: j9q0ihi6
proposal: null
agent: false
created: 2026-10-16T20:04:18.884Z
finished: 2026-10-16T20:05:59.179Z
---
# Fix code to match the Requirements: Prose delle transizioni senza Markdown

## What happens

Nei dettagli di una transizione e negli archi del Diagramma, la descrizione di ogni transizione (il testo dopo i due punti nel Modello) è resa solo con la formattazione in linea. Grassetto, corsivo, codice e link restano; elenchi, titoli e blocchi di codice compaiono come testo scritto.

## What should happen

Ogni testo che il pannello mostra è reso come Markdown in ogni scheda. Le uniche eccezioni sono le descrizioni degli Eventi in una riga d'elenco, che restano in linea. La descrizione di una transizione non è una descrizione di Evento: deve essere resa come Markdown completo, come le altre descrizioni del Diagramma.

## Chosen option

**Testo completo in ogni elenco**

La descrizione di ogni transizione è resa come Markdown completo dove compare: nel dettaglio di una transizione, nell'elenco delle transizioni di uno Stato e negli archi del Diagramma. Elenchi e blocchi di codice si vedono dentro la voce, che si allunga; il testo resta quello del Modello.

## Where in the code

extension/src/webview/diagram/details.ts (transitionItem: la descrizione è passata come nota in linea); extension/src/webview/diagram/machine.ts (archi di transizione: items con il testo del Modello); extension/src/webview/diagram/panel.ts (renderItem: una nota non block usa renderInline)
