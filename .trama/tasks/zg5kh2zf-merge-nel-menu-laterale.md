---
column: done
technical: false
refs:
  - menu-laterale
  - requirements/ui#menu-laterale
  - requirements/ui#solo-merge
  - requirements/tech#menu-laterale
drift: null
proposal: lx7xcuct
agent: false
created: 2026-10-25T09:03:35.826Z
finished: 2026-10-25T09:44:39.025Z
---
# Merge nel menu laterale

Con Solo mode acceso (i file di Trama fuori da git solo in questa copia di lavoro), il menu laterale offre il pulsante primario `Merge`. Il flusso git (fetch, scelta del branch, merge, conflitti, abort, scan dopo il merge) arriva con un altro Task della stessa Proposal, nel modulo `extension/src/host/solo-merge.ts`; questo Task lo collega al menu.

A Task finito:

- In un progetto con Solo mode acceso, in fondo al menu, dopo la linea, `Merge` (icona `GitMerge`) viene prima di `Scan System` e `Settings`: unico pulsante primario (`default`) del menu, largo quanto la vista, icona e testo a sinistra, senza tooltip. Con Solo mode spento non c'è.
- Disattivato con il motivo in una riga sotto, in testo secondario, il primo valido in quest'ordine: `A merge is in progress.`, `Check out a branch to merge.`, `Commit or stash your changes to merge.`, `Wait for the agent to finish.`. Il nome accessibile è `Merge` seguito dalla riga.
- Con file di Trama ancora tracciati da git, una riga in colore di avviso: `Some Trama files are tracked by git: their changes enter your commits.`; il pulsante resta attivo.
- Durante un merge avviato da Trama, `Merge` è disattivato con la riga `Merging <branch>: resolve the conflicts, then commit.` e sotto i pulsanti `ghost` larghi quanto la vista: nel conflitto `Open Merge Editor` (icona `GitCompare`) e `Reconcile with Agent` (icona `Bot`), e sempre `Abort Merge` (icona `X`).
- Modalità solo icone: `Merge` e i suoi pulsanti mostrano solo l'icona, le righe spariscono, i nomi accessibili restano.
- `menuState` porta `merge`, assente con Solo mode spento: `{ available, reason?: "inProgress" | "detached" | "changes" | "agent", trackedTrama, open?: { branch, conflict } }`, ricalcolato quando il menu si mostra e a ogni cambiamento dei file o dello stato di git. Il menu manda `merge`, `openMergeEditor`, `reconcileMerge` e `abortMerge`, validati come gli altri messaggi, che l'host passa al flusso di Merge.
- Nessun `Tooltip` né `title` nel menu, come oggi.
- I testi sono in inglese e non seguono `trama.language`.
