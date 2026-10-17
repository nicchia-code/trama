---
status: resolved
resolution: fix-code
refs:
  - panel/Diagram
proposal: null
task: 378rse0q
origin: null
critical: false
option: 1
note: null
resolvedBy: tq7cf3la
created: 2026-10-16T19:58:36.265Z
---
# Requisiti dei contenitori non mostrati

## What happens

Selezionando uno **stato** o una **transizione** del Diagramma, i dettagli mostrano solo i Requisiti scritti per quello stesso elemento. I Requisiti attaccati al Machine o alla Feature che lo contengono, o agli stati padre, non compaiono, anche se il Modello li attacca anche a lui.

## What should happen

Selezionando qualcosa, il Diagramma mostra i **Requisiti attaccati** a quell'elemento. Per il Modello sono attaccati anche a ciò che lo contiene: un Requisito scritto per il Machine o per la Feature vale per ogni suo stato e transizione, come mostra la vista di uno stato.

## Fix options

### Mostrare anche i Requisiti dei contenitori

Sotto i Requisiti dell'elemento, il dettaglio di uno stato o di una transizione aggiunge i Requisiti del Machine, della Feature e degli stati padre, ognuno con il nome del contenitore. Il testo resta quello scritto nei Requisiti, senza modifiche. Costa: il dettaglio si allunga e lo stesso Requisito del Machine compare più volte nei suoi stati.

### Blocco ripiegato dei contenitori

Sotto i Requisiti dell'elemento compare una sezione ripiegata «Requisiti dei contenitori» che, aperta, mostra i Requisiti del Machine, della Feature e degli stati padre con il testo. Il dettaglio resta corto e il testo si legge con un clic. Costa: un clic in più per leggere i Requisiti che non sono in vista.

## Where in the code

extension/src/webview/diagram/index.ts (currentDetail: i Requisiti vengono solo da un riferimento, quello del nodo, dell'arco o del livello); extension/src/webview/diagram/details.ts (requirementItems confronta un solo riferimento); extension/src/webview/diagram/machine.ts (gli archi di una transizione portano solo i riferimenti della transizione)
