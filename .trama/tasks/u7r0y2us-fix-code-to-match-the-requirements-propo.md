---
column: done
technical: true
refs:
  - requirements/tech#project
drift: 20f172ce
proposal: null
agent: false
created: 2026-10-14T16:01:08.892Z
finished: 2026-10-14T16:06:08.816Z
---
# Fix code to match the Requirements: Proposal edit accepts Task files in Proposals that cannot hold Tasks

## What happens

Il comando `proposal edit` accetta un file `tasks/<nome>.md` in qualsiasi Proposal aperta o in bozza, anche in una risoluzione di Drift o in una Proposal allegata a un Drift. Il file viene creato e l'errore arriva solo dopo, con la validazione.

## What should happen

Il Requisito dice che il file di un Task si accetta solo per una Proposal ordinaria non allegata a un Drift. Per le altre il comando deve rifiutare, prima di creare il file.

## Chosen option

**Rifiutare nel comando**

Il comando `proposal edit` rifiuta i file `tasks/` nelle Proposal che non possono averne, con il motivo già scritto dalla validazione. Il developer e l'agente lo sanno subito, senza un file da scartare. Costo: un controllo in un solo punto del codice.

## Where in the code

src/core/proposals.ts (editTaskInProposal, editInProposal; taskRules per la validazione)
