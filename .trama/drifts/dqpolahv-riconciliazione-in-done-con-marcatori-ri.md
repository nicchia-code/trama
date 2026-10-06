---
status: resolved
resolution: fix-code
refs:
  - worktree-round/Reconciling
proposal: irmfw9nk
task: qzgdm3h1
origin: null
option: 1
note: null
created: 2026-10-06T16:43:23.671Z
---
# Riconciliazione in Done con marcatori rimasti: il giro torna in conflitto, il Model non lo prevede

## What happens

Quando finisce il comando dell'agente di riconciliazione con il Task **in Done**, Trama controlla se nel worktree di merge restano **marcatori di conflitto**. Se ne trova:

- non committa nulla e non riprova l'unione;
- elimina il Task di riconciliazione e riscrive il Merge Drift;
- avvisa che il giro ha conflitti.

Il giro torna quindi in **Conflict**, da dove il developer può riconciliare di nuovo o abbandonare.

## What should happen

Il Model, da Reconciling, conosce solo due uscite alla fine del comando: con il Task in Done il giro va in **Merging** (si committa ciò che resta e si riprova l'unione), altrimenti resta in Reconciling. Non prevede il caso del Task in Done con marcatori ancora presenti, che seguendo il Model alla lettera porterebbe i marcatori nel branch, contro `requirements/quality#worktree-round`.

## Fix options

### Non lasciare andare in Done il Task con marcatori rimasti

Spostare in Done il Task di riconciliazione è rifiutato finché nel worktree di merge restano marcatori di conflitto, con il motivo. Alla fine del comando un Task in Done implica nessun marcatore: il giro va in Merging, altrimenti resta in Reconciling con l'avviso, come dice il Model. Costo: un controllo in più sul Task di riconciliazione.

### Seguire il Model alla lettera

Con il Task in Done si committa e si riprova l'unione anche con i marcatori. Nessun controllo in più, ma i marcatori possono finire nel branch e nella cartella aperta, contro il requisito di qualità del giro: sconsigliato.

## Where in the code

src/core/worktree-merge.ts (finishReconciliation, conflictMarkers, conflictLeft); extension/src/host/agent.ts (watchAgentTerminal, reportRoundMerge)
