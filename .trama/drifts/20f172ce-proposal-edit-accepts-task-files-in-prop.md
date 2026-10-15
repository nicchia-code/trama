---
status: resolved
resolution: fix-code
refs:
  - requirements/tech#project
proposal: null
task: u7r0y2us
origin: null
critical: false
option: 1
note: null
resolvedBy: a46tgzxd
created: 2026-10-14T14:41:33.091Z
---
# Proposal edit accepts Task files in Proposals that cannot hold Tasks

## What happens

Il comando `proposal edit` accetta un file `tasks/<nome>.md` in qualsiasi Proposal aperta o in bozza, anche in una risoluzione di Drift o in una Proposal allegata a un Drift. Il file viene creato e l'errore arriva solo dopo, con la validazione.

## What should happen

Il Requisito dice che il file di un Task si accetta solo per una Proposal ordinaria non allegata a un Drift. Per le altre il comando deve rifiutare, prima di creare il file.

## Fix options

### Rifiutare nel comando

Il comando `proposal edit` rifiuta i file `tasks/` nelle Proposal che non possono averne, con il motivo già scritto dalla validazione. Il developer e l'agente lo sanno subito, senza un file da scartare. Costo: un controllo in un solo punto del codice.

### Lasciare la validazione

Il comando resta com'è: il file si crea e la validazione segnala l'errore. Il Requisito va corretto dicendo che è la validazione, non il comando, a respingere questi file. Costo: un file da scartare a mano e un Requisito da riscrivere.

## Where in the code

src/core/proposals.ts (editTaskInProposal, editInProposal; taskRules per la validazione)
