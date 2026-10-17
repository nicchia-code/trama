---
status: resolved
resolution: fix-code
refs:
  - panel/Diagram
proposal: null
task: ivof1p9h
origin: null
critical: false
option: 1
note: null
resolvedBy: ufn0dm31
created: 2026-10-16T19:53:44.078Z
---
# Il Diagramma non mostra i Requisiti di un Drift selezionato

## What happens

Selezionando un Drift nel Diagramma, i dettagli mostrano il titolo, i due lati e la sezione **Points at**, ma nessuna sezione di Requisiti. Eppure il Drift punta a elementi del Modello o a sezioni di Requisiti che hanno un testo scritto: selezionando quell'elemento, quel testo compare; selezionando il Drift, no.

## What should happen

Selezionando qualcosa, il Diagramma mostra i suoi dettagli **e i suoi Requisiti**. Un Drift è qualcosa che si seleziona: i dettagli mostrano anche le sezioni di Requisiti scritte per i suoi riferimenti, come per ogni altro elemento.

## Fix options

### Requisiti per riferimento, sotto Points at

Dopo Points at, per ogni riferimento del Drift nel suo ordine compare il testo delle sezioni di Requisiti scritte per quel riferimento, con lo stesso aspetto che hanno selezionando l'elemento. Un riferimento che non si risolve non ha testo. Non cambia il Modello né alcun Requisito. Costa: i dettagli di un Drift con molti riferimenti si allungano.

### Blocco unico Requisiti in fondo

Dopo i due lati e Points at compare un solo blocco Requisiti, con il testo delle sezioni di tutti i riferimenti senza ripetizioni, nell'ordine dei riferimenti. Non cambia il Modello né alcun Requisito. Costa: il testo non è più accanto al riferimento a cui appartiene, quindi con più riferimenti non si capisce subito da quale viene.

## Where in the code

extension/src/webview/diagram/index.ts (currentDetail: i riferimenti dei Requisiti vengono solo dal nodo, dall'arco o dal livello selezionato); extension/src/webview/diagram/drifts.ts (il nodo fantasma di un Drift non ha ref e il suo arco ha refs vuoti)
