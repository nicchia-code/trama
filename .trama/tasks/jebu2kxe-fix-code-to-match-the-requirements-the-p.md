---
column: done
technical: true
refs:
  - requirements/tech#proposal
drift: jy4z017t
proposal: null
agent: false
created: 2026-10-09T12:54:20.722Z
finished: 2026-10-09T18:40:55.485Z
---
# Fix code to match the Requirements: The panel decides attachment to an open Drift outside src/core

## What happens

La riga di comando e l'host chiedono a `src/core` se una Proposal è allegata a un Drift aperto (approvazione e rifiuto rifiutati, `trama board`, `trama proposal list` e `show`).

Il pannello invece **rifà la stessa regola per conto suo**: la Board, il numero della colonna e del badge, il selettore della Proposal disegnata nel Diagramma e quello della scheda Requirements tolgono le Proposal allegate confrontandole con i Drift aperti ricevuti. Il comportamento visibile oggi coincide, ma la regola vive in **due posti**.

## What should happen

`tech#proposal` dice che il pannello applica la stessa regola in `src/core`, che decide se una Proposal è allegata a un Drift aperto **per la Board, il Diagramma, la scheda Requirements e la riga di comando**. Una sola decisione, così un cambio della regola (per esempio un nuovo stato del Drift) vale ovunque insieme.

## Chosen option

**Let src/core mark attached Proposals for the panel**

Ciò che `src/core` manda al pannello dice già, per ogni Proposal aperta, se è allegata a un Drift aperto (o la toglie dalle Proposal da decidere), con la stessa decisione usata dalla riga di comando. Il pannello smette di ricalcolarla e la legge. Costa un piccolo cambio dei dati del pannello e dei suoi controlli.

## Where in the code

extension/src/webview/board/logic.ts (`proposalsToDecide`), usata da extension/src/webview/main.ts, diagram/index.ts e requirements/index.ts; la regola di src/core è `attachedDrift` in src/core/work.ts
