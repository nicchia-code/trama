---
column: done
technical: false
refs:
  - panel/Diagram
drift: t9ps08xy
proposal: null
agent: false
created: 2026-10-16T19:59:54.984Z
finished: 2026-10-17T01:41:30.723Z
---
# Fix code to match the Model: Requisiti dei contenitori non mostrati

## What happens

Selezionando uno **stato** o una **transizione** del Diagramma, i dettagli mostrano solo i Requisiti scritti per quello stesso elemento. I Requisiti attaccati al Machine o alla Feature che lo contengono, o agli stati padre, non compaiono, anche se il Modello li attacca anche a lui.

## What should happen

Selezionando qualcosa, il Diagramma mostra i **Requisiti attaccati** a quell'elemento. Per il Modello sono attaccati anche a ciò che lo contiene: un Requisito scritto per il Machine o per la Feature vale per ogni suo stato e transizione, come mostra la vista di uno stato.

## Chosen option

**Mostrare anche i Requisiti dei contenitori**

Sotto i Requisiti dell'elemento, il dettaglio di uno stato o di una transizione aggiunge i Requisiti del Machine, della Feature e degli stati padre, ognuno con il nome del contenitore. Il testo resta quello scritto nei Requisiti, senza modifiche. Costa: il dettaglio si allunga e lo stesso Requisito del Machine compare più volte nei suoi stati.

## Where in the code

extension/src/webview/diagram/index.ts (currentDetail: i Requisiti vengono solo da un riferimento, quello del nodo, dell'arco o del livello); extension/src/webview/diagram/details.ts (requirementItems confronta un solo riferimento); extension/src/webview/diagram/machine.ts (gli archi di una transizione portano solo i riferimenti della transizione)
