---
column: done
technical: false
refs:
  - worktree-round/Merging/worktree-round.MERGE_CONFLICT
  - worktree-round/Conflict/developer.RECONCILE_MERGE
  - worktree-round/Reconciling
  - requirements/rules#worktree-round
drift: z4nwd3ut
proposal: null
agent: false
created: 2026-10-05T14:38:24.414Z
---
# Fix code to match the Model: On a merge conflict the merge worktree goes back to the starting commit and the agent finds no conflicts to reconcile

## What happens

Quando l'unione del giro ha conflitti, Trama annulla l'unione e riporta il worktree di merge al **commit di partenza**, senza nessuna modifica delle Proposal e senza marcatori di conflitto. Se il developer sceglie di riconciliare, l'agente parte in quella cartella con un Task che parla di conflitti e di marcatori che non ci sono, e non gli dice di unire i branch del giro. Se chiude il Task senza modifiche, l'unione si riprova e torna in conflitto.

## What should happen

L'agente riconcilia nel worktree di merge: lì trova il risultato dell'unione **con i conflitti da sistemare** (e i marcatori, per l'opzione «Reconcile from the conflict markers»). Solo la cartella aperta e il branch non ricevono mai i marcatori.

## Chosen option

**Lasciare i conflitti nel worktree di merge**

In conflitto Trama non annulla l'unione nel worktree di merge: la lascia con i conflitti e i marcatori, così il Merge Drift e il Task di riconciliazione lavorano su conflitti reali. La cartella aperta resta intatta. È ciò che descrivono il Modello e le due opzioni del Merge Drift.

## Where in the code

`src/core/worktree-merge.ts`: `mergeRound` e `mergeBranches` (dopo un'unione fallita annullano e tornano al commit di partenza); `reconcileMerge` crea il Task con solo titolo e testo dell'opzione.
