---
column: done
technical: false
refs:
  - task
  - worktree-round/Reconciling
drift: g9w2s0zd
proposal: null
agent: false
created: 2026-10-06T15:00:37.360Z
finished: 2026-10-06T15:04:26.671Z
---
# Fix code to match the Model: Il Task di riconciliazione nel worktree di merge termina con la scansione dell'intero System

## What happens

Quando il developer sceglie di riconciliare il giro, Trama avvia l'agente nel **worktree di merge** con la sola istruzione di realizzare il Task di riconciliazione. L'istruzione non dice di saltare la scansione finale, quindi la corsa, finito il Task e passata la verifica, **scansiona l'intero System** dentro il worktree di merge e vi archivia Task e Drift.

Quei Task e Drift finiscono poi nel commit che Trama fa alla fine del comando, ed entrano nel branch con l'unione, mentre dopo l'unione parte comunque la scansione di controllo.

## What should happen

Il Model del Task dice che **in un worktree la corsa non fa la scansione di fine corsa**, perché dopo l'unione il Worktree round ne fa già una di controllo. Vale anche per la corsa del Task di riconciliazione nel worktree di merge: finito il Task, l'agente fa la verifica, scrive il resoconto e si ferma.

## Chosen option

**Dire di non scansionare nell'istruzione di riconciliazione**

L'istruzione con cui Trama avvia l'agente di riconciliazione aggiunge, come quella dei Task dei worktree, che non deve scansionare l'intero System alla fine, perché Trama controlla il codice dopo l'unione. Modifica piccola e allineata alle altre istruzioni dei worktree; dipende dal fatto che l'agente segua l'istruzione.

## Where in the code

extension/src/host/controller.ts (avvio di launchReconcileAgent con il prompt di un Task singolo); extension/src/host/prompts.ts (buildPrompt per implement, a confronto con buildWorktreeTasksPrompt)
