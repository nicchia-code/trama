---
column: done
technical: false
refs:
  - diagram
drift: oxnkgpbv
proposal: null
agent: false
created: 2026-10-14T18:00:41.546Z
finished: 2026-10-14T18:05:09.564Z
---
# Fix code to match the Model: Machine level offers no link that opens another Machine

## What happens

Dal livello di una Machine il developer non può aprire un'altra Machine con un solo passaggio. Il Diagramma non mostra nessun collegamento verso un'altra Machine: per arrivarci deve risalire alla Feature con il breadcrumb e aprire la Machine da lì. Il pannello del livello Machine mostra solo la descrizione e il file della Machine; gli Eventi che la Machine invia, con i loro destinatari, compaiono solo quando la Machine è selezionata al livello di Feature.

## What should happen

Il Modello prevede che dal Machine level si apra un'altra Machine (developer.OPEN_MACHINE_LEVEL → Machine level: another Machine is shown), seguendo un collegamento a uno Stato o a una Transizione di quella Machine. Il Modello però non dice quale elemento del Machine level porta quel collegamento: il livello mostra solo Stati e Transizioni della Machine, e nessuno di essi rimanda a un'altra Machine. Senza sapere dove sta il collegamento non si può decidere cosa mostrare né quale elemento selezionare.

## Chosen option

**Collegare ogni destinatario allo Stato che lo riceve**

Nel livello Machine il pannello elenca gli Eventi che la Machine invia, e ogni destinatario è un collegamento allo Stato che lo riceve: seguirlo apre il livello di quella Machine con lo Stato selezionato. Costo: il livello Machine mostra anche gli Eventi inviati, oggi visibili solo dalla Feature.

## Where in the code

extension/src/webview/diagram/details.ts (detailOfLevel, caso machine; eventItems e receiversNote); extension/src/webview/diagram/machine.ts (machineGraph); extension/src/webview/diagram/index.ts (navigateRef, drillTarget in levels.ts)
