---
column: done
technical: false
refs:
  - panel/Diagram
drift: p5u4x3dj
proposal: null
agent: false
created: 2026-10-16T19:55:09.851Z
finished: 2026-10-17T01:40:13.636Z
---
# Fix code to match the Model: Il Diagramma non mostra i Requisiti di un Drift selezionato

## What happens

Selezionando un Drift nel Diagramma, i dettagli mostrano il titolo, i due lati e la sezione **Points at**, ma nessuna sezione di Requisiti. Eppure il Drift punta a elementi del Modello o a sezioni di Requisiti che hanno un testo scritto: selezionando quell'elemento, quel testo compare; selezionando il Drift, no.

## What should happen

Selezionando qualcosa, il Diagramma mostra i suoi dettagli **e i suoi Requisiti**. Un Drift è qualcosa che si seleziona: i dettagli mostrano anche le sezioni di Requisiti scritte per i suoi riferimenti, come per ogni altro elemento.

## Chosen option

**Requisiti per riferimento, sotto Points at**

Dopo Points at, per ogni riferimento del Drift nel suo ordine compare il testo delle sezioni di Requisiti scritte per quel riferimento, con lo stesso aspetto che hanno selezionando l'elemento. Un riferimento che non si risolve non ha testo. Non cambia il Modello né alcun Requisito. Costa: i dettagli di un Drift con molti riferimenti si allungano.

## Where in the code

extension/src/webview/diagram/index.ts (currentDetail: i riferimenti dei Requisiti vengono solo dal nodo, dall'arco o dal livello selezionato); extension/src/webview/diagram/drifts.ts (il nodo fantasma di un Drift non ha ref e il suo arco ha refs vuoti)
