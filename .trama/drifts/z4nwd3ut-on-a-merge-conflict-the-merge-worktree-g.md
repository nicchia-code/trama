---
status: resolved
resolution: fix-code
refs:
  - worktree-round/Merging/worktree-round.MERGE_CONFLICT
  - worktree-round/Conflict/developer.RECONCILE_MERGE
  - worktree-round/Reconciling
  - requirements/rules#worktree-round
proposal: null
task: cud3dp5v
origin: null
option: 1
note: null
created: 2026-10-05T14:31:38.364Z
---
# On a merge conflict the merge worktree goes back to the starting commit and the agent finds no conflicts to reconcile

## What happens

Quando l'unione del giro ha conflitti, Trama annulla l'unione e riporta il worktree di merge al **commit di partenza**, senza nessuna modifica delle Proposal e senza marcatori di conflitto. Se il developer sceglie di riconciliare, l'agente parte in quella cartella con un Task che parla di conflitti e di marcatori che non ci sono, e non gli dice di unire i branch del giro. Se chiude il Task senza modifiche, l'unione si riprova e torna in conflitto.

## What should happen

L'agente riconcilia nel worktree di merge: lì trova il risultato dell'unione **con i conflitti da sistemare** (e i marcatori, per l'opzione «Reconcile from the conflict markers»). Solo la cartella aperta e il branch non ricevono mai i marcatori.

## Fix options

### Lasciare i conflitti nel worktree di merge

In conflitto Trama non annulla l'unione nel worktree di merge: la lascia con i conflitti e i marcatori, così il Merge Drift e il Task di riconciliazione lavorano su conflitti reali. La cartella aperta resta intatta. È ciò che descrivono il Modello e le due opzioni del Merge Drift.

### Far rifare l'unione all'agente

Il worktree resta pulito, ma il Task di riconciliazione dice di unire i branch del giro uno per uno e di risolvere i conflitti. Funziona per «Reconcile keeping every behaviour», ma l'opzione dei marcatori parte senza marcatori.

### Cambiare il Modello

Il Modello dice che la riconciliazione riparte dal commit di partenza e che è l'agente a rifare l'unione. Cambia il significato delle opzioni del Merge Drift, che vanno riscritte.

## Where in the code

`src/core/worktree-merge.ts`: `mergeRound` e `mergeBranches` (dopo un'unione fallita annullano e tornano al commit di partenza); `reconcileMerge` crea il Task con solo titolo e testo dell'opzione.
