---
status: resolved
resolution: fix-code
refs:
  - task
  - worktree-round/Reconciling
proposal: null
task: lo9sg6cb
origin: null
option: 1
note: null
created: 2026-10-06T14:57:18.521Z
---
# Il Task di riconciliazione nel worktree di merge termina con la scansione dell'intero System

## What happens

Quando il developer sceglie di riconciliare il giro, Trama avvia l'agente nel **worktree di merge** con la sola istruzione di realizzare il Task di riconciliazione. L'istruzione non dice di saltare la scansione finale, quindi la corsa, finito il Task e passata la verifica, **scansiona l'intero System** dentro il worktree di merge e vi archivia Task e Drift.

Quei Task e Drift finiscono poi nel commit che Trama fa alla fine del comando, ed entrano nel branch con l'unione, mentre dopo l'unione parte comunque la scansione di controllo.

## What should happen

Il Model del Task dice che **in un worktree la corsa non fa la scansione di fine corsa**, perché dopo l'unione il Worktree round ne fa già una di controllo. Vale anche per la corsa del Task di riconciliazione nel worktree di merge: finito il Task, l'agente fa la verifica, scrive il resoconto e si ferma.

## Fix options

### Dire di non scansionare nell'istruzione di riconciliazione

L'istruzione con cui Trama avvia l'agente di riconciliazione aggiunge, come quella dei Task dei worktree, che non deve scansionare l'intero System alla fine, perché Trama controlla il codice dopo l'unione. Modifica piccola e allineata alle altre istruzioni dei worktree; dipende dal fatto che l'agente segua l'istruzione.

### Far riconoscere il worktree alla skill

La skill `trama-implement` salta da sé la scansione finale quando la cartella è un worktree di Trama, per esempio chiedendolo alla riga di comando. Copre ogni corsa futura in un worktree anche se un'istruzione dimentica di dirlo, ma serve un modo per riconoscere il worktree e una regola in più nella skill.

## Where in the code

extension/src/host/controller.ts (avvio di launchReconcileAgent con il prompt di un Task singolo); extension/src/host/prompts.ts (buildPrompt per implement, a confronto con buildWorktreeTasksPrompt)
