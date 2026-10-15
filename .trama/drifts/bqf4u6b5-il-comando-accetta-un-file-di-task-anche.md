---
status: resolved
resolution: fix-code
refs:
  - requirements/tech#project
proposal: null
task: 9521r56y
origin: null
critical: false
option: 1
note: null
resolvedBy: zxoqdayf
created: 2026-10-14T12:19:48.317Z
---
# Il comando accetta un file di Task anche dove la Proposal non ne può contenere

## What happens

Il comando che registra un file di Task dentro una Proposal lo accetta per ogni Proposal ancora modificabile, anche per una risoluzione di Drift o per una Proposal allegata a un Drift. Il rifiuto arriva solo alla consegna, quando la validazione segnala che quella Proposal non può avere Task.

## What should happen

Il Requisito dice che il comando accetta i file dei Task solo per una Proposal ordinaria, non allegata a un Drift. Le altre Proposal devono essere rifiutate subito, con un messaggio che spiega perché, prima che il file sia scritto.

## Fix options

### Rifiutare subito il file di Task per le altre Proposal

Il comando rifiuta il file, con il motivo, per risoluzioni e Proposal allegate, senza scrivere nulla. Chi lavora sulla Proposal vede l'errore nel momento in cui sbaglia, e non resta un file da togliere. Costo: un controllo in più nel comando di modifica, nello stesso punto in cui oggi si controlla lo stato.

### Accettare il file e lasciare il controllo alla validazione

Il comando resta com'è, e la validazione segnala il file alla consegna. Costo: l'errore emerge tardi e il file va tolto a mano; il Requisito va cambiato per dire che il comando accetta i Task per ogni Proposal.

## Where in the code

src/core/proposals.ts, nel comando che registra un file in tasks/
