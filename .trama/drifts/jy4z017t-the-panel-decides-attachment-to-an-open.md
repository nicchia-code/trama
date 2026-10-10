---
status: resolved
resolution: fix-code
refs:
  - requirements/tech#proposal
proposal: null
task: jebu2kxe
origin: null
option: 1
note: null
resolvedBy: sjsoc8fq
created: 2026-10-09T12:29:49.369Z
---
# The panel decides attachment to an open Drift outside src/core

## What happens

La riga di comando e l'host chiedono a `src/core` se una Proposal è allegata a un Drift aperto (approvazione e rifiuto rifiutati, `trama board`, `trama proposal list` e `show`).

Il pannello invece **rifà la stessa regola per conto suo**: la Board, il numero della colonna e del badge, il selettore della Proposal disegnata nel Diagramma e quello della scheda Requirements tolgono le Proposal allegate confrontandole con i Drift aperti ricevuti. Il comportamento visibile oggi coincide, ma la regola vive in **due posti**.

## What should happen

`tech#proposal` dice che il pannello applica la stessa regola in `src/core`, che decide se una Proposal è allegata a un Drift aperto **per la Board, il Diagramma, la scheda Requirements e la riga di comando**. Una sola decisione, così un cambio della regola (per esempio un nuovo stato del Drift) vale ovunque insieme.

## Fix options

### Let src/core mark attached Proposals for the panel

Ciò che `src/core` manda al pannello dice già, per ogni Proposal aperta, se è allegata a un Drift aperto (o la toglie dalle Proposal da decidere), con la stessa decisione usata dalla riga di comando. Il pannello smette di ricalcolarla e la legge. Costa un piccolo cambio dei dati del pannello e dei suoi controlli.

### Accept the panel's own derivation

Si cambia `tech#proposal` per dire che il pannello ricava l'allegato dai Drift aperti che riceve da `src/core`. Il codice resta com'è. Costa una regola scritta due volte: un cambio futuro di cosa vuol dire «allegata» va fatto in entrambi i posti.

## Where in the code

extension/src/webview/board/logic.ts (`proposalsToDecide`), usata da extension/src/webview/main.ts, diagram/index.ts e requirements/index.ts; la regola di src/core è `attachedDrift` in src/core/work.ts
