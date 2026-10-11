---
status: resolved
resolution: fix-code
refs:
  - requirements/ui#drift
proposal: null
task: hjvgpsnm
origin: null
critical: false
option: 1
note: null
resolvedBy: rcz51nw7
created: 2026-10-11T09:45:07.232Z
---
# The ghost of a Drift with a Draft says Writing instead of Writing the Proposal

## What happens

Quando l'agente lega una Draft all'annuncio di un Drift, il ghost del Drift sulla Board mostra la riga di fase **Writing**, la stessa di una Proposal in scrittura, e il nome accessibile dice "writing". La Draft non ha un ghost proprio, quindi nulla distingue che si sta scrivendo la Proposal allegata al Drift.

## What should happen

Il Requisito dell'interfaccia dei Drift dice che il ghost di un Drift la cui Draft esiste già ha la riga di fase **Writing the Proposal** al posto di *Preparing*, e che il nome accessibile la ripete. Il Requisito della Board ammette invece soltanto *Preparing*, *Writing* e *Waiting for your answers* per ogni ghost: i due testi sono in contrasto e il codice segue il secondo.

## Fix options

### Mostrare Writing the Proposal sui ghost dei Drift

Solo il ghost di un Drift con una Draft legata riporta **Writing the Proposal**, riga e nome accessibile; gli altri ghost restano su Preparing, Writing e Waiting for your answers. Costa una fase in più per i Drift e vale il Requisito dei Drift; il Requisito della Board resta da allineare.

### Mostrare Writing the Proposal anche nel titolo del ghost

La riga di fase resta **Writing**, ma il ghost del Drift aggiunge a parte, accanto al tipo, l'indicazione che si scrive la Proposal allegata, ripetuta nel nome accessibile. Soddisfa il senso del Requisito dei Drift senza cambiare le fasi della Board; costa una resa speciale per i soli Drift.

## Where in the code

extension/src/webview/board/logic.ts: announcedPhase e announcedCard; src/core/snapshot.ts: announcementView (fase writing quando esiste la Draft)
