---
status: resolved
resolution: fix-code
refs:
  - task/Taken by the agent/terminal.COMMAND_ENDED
  - requirements/rules#task
proposal: null
task: v4h3nn1k
origin: null
option: 1
note: null
created: 2026-10-06T14:27:03.552Z
---
# La fine di un comando qualsiasi nel terminale dell'agente rilascia i Task presi

## What happens

Nel terminale dell'agente della cartella aperta, **la fine di qualunque comando** rilascia i Task presi da quel terminale e li riporta in To do: anche un comando diverso da quello che Trama ha scritto, o una fine segnalata senza la riga del comando. Il controllo che sia il comando dell'agente arriva solo dopo, e vale per annunci e avvisi ma non per i Task.

Nei terminali dei worktree e nelle finestre esterne, invece, conta solo la fine del comando scritto da Trama.

## What should happen

Il Modello dice che un Task preso torna in To do quando finisce **il comando dell'agente** nel terminale che l'ha preso: solo allora nessun agente ci sta più lavorando. La fine di un altro comando non rilascia nulla, come già vale per il ritiro degli annunci, che ignora ogni fine di cui Trama non sa dire che è il comando che ha scritto.

## Fix options

### Rilasciare solo alla fine del comando scritto da Trama

Il rilascio dei Task del terminale della cartella aperta passa dopo il controllo che il comando finito sia quello che Trama ha scritto, come per i worktree e gli annunci. Costa poco. Un Task preso da un comando scritto a mano in quel terminale resta preso finché il developer non lo riprende con `task take-back`.

### Cambiare il Modello: ogni comando del terminale rilascia

Il Modello dice che la fine di qualunque comando nel terminale dell'agente rilascia i Task presi lì, perché qualunque comando in quel terminale può prenderli. Il codice resta com'è, ma diventa diverso dai worktree e dalle finestre esterne, che andrebbero allineati o descritti come eccezione.

## Where in the code

`extension/src/host/agent.ts`, `watchAgentTerminal`: nel ramo del terminale della cartella aperta `releaseTakenTasks` è chiamato prima di `isTypedCommand`.
