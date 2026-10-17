---
column: done
technical: true
refs:
  - requirements/tech#proposal
drift: ecpdmokg
proposal: null
agent: false
created: 2026-10-16T10:20:57.438Z
finished: 2026-10-16T10:32:13.914Z
---
# Fix code to match the Requirements: Proposal allegata a un Drift: la vista mostra i Task di rimozione che l'approvazione non crea

## What happens

Per una Proposal allegata a un Drift aperto, `trama proposal show` stampa come per una Proposal ordinaria le sezioni **Created on approval** e **Scope**: elenca un `Remove code of` per ogni elemento che la Proposal toglie, e voci come **not covered**. Ma una Proposal allegata non porta Task: approvandola attraverso il Drift non si crea nessun Task di rimozione. La vista promette lavoro che non arriverà.

## What should happen

Il Modello dice che una Proposal allegata a un Drift non porta Task, e che l'approvazione crea il Task di rimozione solo per una Proposal ordinaria che porta Task. La vista di `trama proposal show` deve mostrare `## Created on approval` e `## Scope` solo per una Proposal ordinaria non allegata, come scrive il Requisito di tech#proposal; per una Proposal allegata non deve annunciare rimozioni che non arriveranno.

## Chosen option

**Vista senza sezioni di Task per una Proposal allegata**

Per una Proposal allegata a un Drift, `trama proposal show` non stampa **Created on approval** né **Scope**, e dice in una riga che la Proposal non porta Task e si decide sul Drift. Nessun dato cambia e nessuna approvazione cambia: cambia solo la lettura. Costa poco, e rispetta il Requisito, che descrive quelle sezioni solo per una Proposal ordinaria non allegata.

## Where in the code

src/cli/work.ts, proposalShowView: il calcolo di coverage (riga 57) vale per ogni Proposal viva di tipo change o setup, anche allegata, e le sezioni ## Created on approval e ## Scope (righe 83-84) la stampano; src/core/proposals.ts, approveProposal: bringsTasks = holdsTasks(...) è falso per una Proposal allegata, quindi nessun Task di rimozione viene creato.
