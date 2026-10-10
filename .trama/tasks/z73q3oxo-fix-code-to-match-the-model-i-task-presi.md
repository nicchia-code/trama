---
column: done
technical: false
refs:
  - task/Taken by the agent
  - requirements/rules#task
  - requirements/rules#agent-terminal
drift: zy2058mf
proposal: null
agent: false
created: 2026-10-10T14:15:26.756Z
finished: 2026-10-10T17:28:24.767Z
---
# Fix code to match the Model: I Task presi vengono rilasciati dopo quindici minuti di quiete senza un evento di fine

## What happens

Un Task preso da un agente seguito con hook torna in To do dopo quindici minuti senza attività osservata, anche se non sono arrivati agent-hook.IDLE, terminal.COMMAND_ENDED o terminal.CLOSED. Il rilascio elimina la presa e rende nuovamente eseguibile il Task mentre il comando potrebbe essere ancora al lavoro. Sono rilasciati anche i Task presi senza origine riconosciuta. Un round di domande sospende questo conteggio, ma non elimina il rilascio per quiete.

## What should happen

Un Task resta Taken by the agent finché un evento previsto lo rilascia: hook a riposo, fine del comando, chiusura del terminale, fine della conversazione di chat applicabile, oppure uno spostamento esplicito o la ripresa del developer. Con omp e Claude Code non esiste un rilascio per quiete. In assenza di segnali la corsa resta in corso: il tempo senza attività osservata non dimostra che il Task non sia più lavorato.

## Chosen option

**Eliminare il rilascio per quiete dei Task**

Lasciare i Task presi fino a un evento di fine previsto o a una decisione esplicita del developer. La mancanza di attività osservabile non li rende nuovamente eseguibili. Si elimina il rilascio temporizzato: se un agente non riesce a riferire la propria fine, il developer deve chiudere il terminale oppure riprendere il Task dalla riga di comando.

## Where in the code

extension/src/host/agent.ts: releaseQuietHookedTasks, quietElapsed e watchAgentTerminal; src/core/work.ts: releaseTasks; test/host-agent-terminals.test.ts: casi del rilascio dei Task dopo la quiete.
