---
status: resolved
resolution: fix-code
refs:
  - drift/Open
  - requirements/ui#drift
proposal: null
task: qhvaenwf
origin: null
critical: false
option: 1
note: null
resolvedBy: feyjukk9
created: 2026-10-16T12:26:13.228Z
---
# «Dismiss Drift» resta attivo quando il Drift sta in una risoluzione in scrittura

## What happens

Mentre la risoluzione che elenca il Drift è ancora in scrittura, il pulsante «Dismiss Drift» sulla scheda della Board e nei dettagli del Diagramma resta attivo. Confermandolo, il sistema rifiuta la chiusura e il Drift resta aperto, con un errore: va deciso nella risoluzione.

## What should happen

Il pulsante è disabilitato, con il motivo che il Drift va deciso nella risoluzione, quando il Drift sta in una risoluzione da decidere: sia in scrittura sia aperta. La chiusura è rifiutata in entrambi i casi, quindi il pulsante deve dirlo prima del clic.

## Fix options

### Contare anche le risoluzioni in scrittura nel blocco del pulsante

Il blocco di «Dismiss Drift» considera tutte le risoluzioni da decidere, in scrittura o aperte, e non solo quelle aperte. Le schede e le righe restano come sono: il Drift resta rosso finché la risoluzione è in scrittura. Costo: una lettura in più delle risoluzioni nello stato della Board e del Diagramma.

### Passare al pannello l'elenco delle risoluzioni in scrittura

Lo stato per il pannello porta a parte l'elenco delle Proposal di risoluzione in scrittura, usato solo per il blocco di «Dismiss Drift»; l'elenco delle Proposal da decidere resta com'è. Costo: un campo in più nello stato, da tenere allineato con la regola del rifiuto nel nucleo.

## Where in the code

src/core/snapshot.ts, buildSnapshot: l'elenco proposals comprende solo le Proposal con stato open. extension/src/webview/dismiss.ts, dismissBlocker: controlla solo quelle per decidere se il pulsante è disabilitato; le risoluzioni in scrittura (draft) non vi compaiono. Chiamato da extension/src/webview/board/logic.ts (buildBoard) e extension/src/webview/diagram/index.ts.
