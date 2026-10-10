---
column: done
technical: false
refs:
  - drift-resolution/Free
  - drift-resolution/Running tasks
  - drift-resolution/Resolving
  - requirements/ui#drift-resolution
  - requirements/rules#drift-resolution
drift: null
proposal: hlnh5d44
agent: false
created: 2026-10-09T07:11:11.203Z
finished: 2026-10-09T08:25:15.518Z
---
# Show the Resolve Drifts button with its disabled reasons

La barra della Board ha il pulsante `Resolve Drifts`, subito dopo `Run all To do`; il clic chiede all'host di lanciare Resolve Drifts, senza argomenti.

- Quando non si può usare il pulsante resta visibile, appare disabilitato, è segnato come disabilitato per le tecnologie assistive e dà il motivo nel tooltip e nella descrizione accessibile, come `Run all To do`. Motivi, in quest'ordine quando ne valgono più d'uno: `Drifts are being resolved`, `A run is in progress`, `Proposal <id> resolving Drifts awaits a decision` (la più vecchia ancora in scrittura o aperta), `No open Drifts`.
- Mentre l'agente di Resolve Drifts lavora, `Run all To do`, `Run this design` e il `Run` di ogni Task appaiono disabilitati allo stesso modo con il motivo `Drifts are being resolved`, che vince su ogni altro loro motivo.
- Il pannello si aggiorna quando la finestra cambia fra Free, Running tasks e Resolving e quando cambiano Drift o Proposal di risoluzione.

Fatto quando lo stato e il motivo mostrati coincidono sempre con ciò che l'host accetterebbe.
