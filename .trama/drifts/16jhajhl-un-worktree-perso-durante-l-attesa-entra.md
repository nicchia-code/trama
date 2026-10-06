---
status: resolved
resolution: fix-code
refs:
  - worktree-round.MERGED
  - worktree-round/Waiting/workspace.TREE_READY
  - requirements/quality#worktree-round
proposal: null
task: ixfwansn
origin: null
option: 1
note: null
created: 2026-10-06T12:42:45.805Z
---
# Un worktree perso durante l'attesa entra comunque nel branch ma la sua Proposal resta aperta

## What happens

Dopo che l'unione è pronta (Waiting, ma anche Conflict o Reconciling), un worktree di Proposal può sparire, per esempio per la pulizia automatica di Cursor. Quando l'unione si applica:

- le modifiche di quella Proposal **entrano nel branch**, perché erano già nel worktree di merge;
- ma la Proposal **resta aperta**, non diventa Approved, e il suo branch resta;
- subito dopo il developer è avvisato che la Proposal «è tornata da decidere», anche se il suo Modello è già nella cartella.

## What should happen

Con MERGED ogni Proposal del giro di cui si unisce il lavoro diventa Approved. Se invece un worktree sparisce prima dell'unione, quella Proposal torna da decidere, il developer è avvisato e **il suo lavoro non entra** nel branch; le altre continuano.

## Fix options

### Approvare ogni Proposal unita

All'applicazione Trama prende le Proposal dal giro ricordato, non dalle cartelle ancora presenti: ogni Proposal il cui branch è nel risultato diventa Approved e il suo branch è eliminato, anche se la cartella è sparita. Il Modello resta com'è; nessun avviso sbagliato dopo l'unione.

### Rifare l'unione senza la Proposal persa

Se un worktree sparisce dopo che l'unione è pronta, Trama scarta il risultato, torna la Proposal da decidere con l'avviso e rifà l'unione con le altre. Rispetta l'idea che il lavoro perso non entri, ma serve una reazione a WORKTREE_LOST anche in Waiting, Conflict e Reconciling nel Modello.

### Fermare l'applicazione e avvisare

Con un worktree mancante Trama non applica l'unione, avvisa il developer e lascia solo l'abbandono del giro. Semplice e sicuro per i dati, ma il developer perde anche il lavoro delle altre Proposal; il Modello va precisato.

## Where in the code

src/core/worktree-merge.ts: applyWaitingMerge e landReadyMerge (le Proposal approvate sono solo quelle con la cartella ancora presente); src/core/worktree-round.ts: reconcileLostWorktrees (non agisce mentre il worktree di merge esiste)
