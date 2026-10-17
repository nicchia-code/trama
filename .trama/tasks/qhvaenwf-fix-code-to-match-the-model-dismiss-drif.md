---
column: done
technical: false
refs:
  - drift/Open
  - requirements/ui#drift
drift: kta57a6p
proposal: null
agent: false
created: 2026-10-16T12:32:57.816Z
finished: 2026-10-16T12:39:24.024Z
---
# Fix code to match the Model: «Dismiss Drift» resta attivo quando il Drift sta in una risoluzione in scrittura

## What happens

Mentre la risoluzione che elenca il Drift è ancora in scrittura, il pulsante «Dismiss Drift» sulla scheda della Board e nei dettagli del Diagramma resta attivo. Confermandolo, il sistema rifiuta la chiusura e il Drift resta aperto, con un errore: va deciso nella risoluzione.

## What should happen

Il pulsante è disabilitato, con il motivo che il Drift va deciso nella risoluzione, quando il Drift sta in una risoluzione da decidere: sia in scrittura sia aperta. La chiusura è rifiutata in entrambi i casi, quindi il pulsante deve dirlo prima del clic.

## Chosen option

**Contare anche le risoluzioni in scrittura nel blocco del pulsante**

Il blocco di «Dismiss Drift» considera tutte le risoluzioni da decidere, in scrittura o aperte, e non solo quelle aperte. Le schede e le righe restano come sono: il Drift resta rosso finché la risoluzione è in scrittura. Costo: una lettura in più delle risoluzioni nello stato della Board e del Diagramma.

## Where in the code

src/core/snapshot.ts, buildSnapshot: l'elenco proposals comprende solo le Proposal con stato open. extension/src/webview/dismiss.ts, dismissBlocker: controlla solo quelle per decidere se il pulsante è disabilitato; le risoluzioni in scrittura (draft) non vi compaiono. Chiamato da extension/src/webview/board/logic.ts (buildBoard) e extension/src/webview/diagram/index.ts.
