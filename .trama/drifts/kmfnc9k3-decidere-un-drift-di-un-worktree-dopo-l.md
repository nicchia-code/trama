---
status: resolved
resolution: fix-code
refs:
  - worktree-round/In progress/developer.FIX_DRIFT_CODE
  - worktree-round/In progress/developer.ACCEPT_DRIFT_PROPOSAL
  - worktree-round/In progress/developer.DISMISS_DRIFT
  - worktree-round/Waiting
  - worktree-round/Conflict
  - worktree-round/Reconciling
proposal: null
task: eu1ud5sy
origin: null
option: 1
note: null
created: 2026-10-06T12:42:56.061Z
---
# Decidere un Drift di un worktree dopo l'inizio dell'unione rilancia un lavoro che l'unione butta via

## What happens

Il giro può passare a Merging con un Drift ancora aperto in un worktree (per esempio una scansione che ha archiviato solo un Drift). La Board continua a mostrarlo e il developer può deciderlo anche in **Waiting, Conflict o Reconciling**:

- la decisione è scritta nel worktree e Trama **rilancia l'agente** lì;
- ciò che l'agente fa non entra nell'unione già pronta: quando la cartella è pronta, l'unione si applica senza quel lavoro e il worktree è eliminato, quindi **il lavoro va perso** senza avviso.

## What should happen

Le decisioni su un Drift di un worktree (correggere il codice, accettare la Proposal attaccata, scartare) sono Transizioni solo di **In progress**. Da Merging, Waiting, Conflict e Reconciling il Modello non ne prevede: lì la decisione non cambia il giro e non rilancia nessun lavoro.

## Fix options

### Rifiutare la decisione dopo l'inizio dell'unione

Una volta che il giro ha cominciato a unire, decidere un Drift di un worktree è rifiutato con un avviso, e la Board non offre più la decisione. Il Drift resta com'è e sparisce con il giro. Piccola modifica, il Modello non cambia.

### Lasciar decidere ma senza rilancio

La decisione si scrive nel worktree ma Trama non rilancia l'agente, perché quel lavoro non entrerebbe nell'unione. Nessun lavoro perso, ma una decisione «correggi il codice» crea un Task che non sarà mai fatto; il Modello va precisato.

### Riaprire il giro alla decisione

Decidere un Drift dopo l'inizio dell'unione scarta l'unione pronta e riporta il giro in In progress, così il lavoro rilanciato entra nella prossima unione. Più completo, ma servono Transizioni nuove nel Modello da Waiting e Conflict a In progress.

## Where in the code

extension/src/host/controller.ts: resolveDrift con worktree; extension/src/host/worktree-decision.ts: applyWorktreeDecision; src/core/snapshot.ts (Drift dei worktree mostrati in ogni fase del giro)
