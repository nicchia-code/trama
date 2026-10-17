---
column: done
technical: false
refs:
  - drift-resolution
  - requirements/ui#drift-resolution
drift: zzak925x
proposal: null
agent: false
created: 2026-10-16T10:20:57.453Z
finished: 2026-10-16T10:32:35.524Z
---
# Fix code to match the Model: Uno scan avviato dal developer non libera subito i casi falliti

## What happens

Quando il developer avvia uno scan, un Drift o un Task marcato «autopilot failed» resta escluso e con il suo badge per tutta la durata dello scan. Torna rivalutabile solo quando lo scan dichiara il suo controllo, con esito positivo o negativo, oppure quando finisce. Le domande saltate, invece, tornano rivalutabili appena lo scan parte.

## What should happen

Uno scan avviato dal developer rende rivalutabili i casi falliti **appena parte**, e il badge sparisce allora. Così dice la Machine di Resolve Drifts, dove uno scan avviato dal developer li rende rivalutabili, e così dicono i Requisiti della Board, dove il badge sparisce quando il caso torna rivalutabile. Lo scan non deve riuscire perché questo accada.

## Chosen option

**Liberare i casi falliti all'avvio dello scan del developer**

Quando lo scan del developer parte, il coordinatore toglie dal progetto i casi falliti o esclusi, come già fa per le domande saltate. Il badge sparisce subito, e uno scan automatico non li tocca. Costo: un messaggio di avvio in più da gestire. Se non arriva, il badge resta fino alla fine dello scan, come oggi.

## Where in the code

extension/src/host/controller.ts (caso scan di launchAction, dopo l'invio di developer-scan-started); extension/src/host/drift-resolution.ts (receiveCoordinatorMessage, rami developer-scan-started e job; receiveCheck e noteScanEnd per i casi di scan manuale)
