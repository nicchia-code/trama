---
column: done
technical: false
refs:
  - task/Taken by the agent
  - requirements/rules#task
  - requirements/data#task
drift: k6vnv7y9
proposal: null
agent: false
created: 2026-10-10T16:43:44.217Z
finished: 2026-10-10T17:41:39.036Z
---
# Fix code to match the Model: Unrecognized Task origins are assigned to editor chat

## What happens

Quando un agente riconosciuto dalla riga di comando prende un Task senza un terminale valido né la chat di Cursor riconosciuta, Trama attribuisce la presa alla chat generica dell’editor invece di lasciarla senza proprietario. Di conseguenza l’hook a riposo, la fine del comando e la chiusura di un terminale dell’agente non rilasciano quel Task; nemmeno la fine di un turno Cursor lo rilascia. Lo rilascia invece una fine di turno Copilot del progetto. Il caso comprende sia un’identità di terminale assente sia un’identità non valida. I Task già presi senza proprietario non hanno questo problema.

## What should happen

Un Task preso da un agente senza terminale o chat riconosciuti non appartiene alla chat dell’editor: resta preso senza proprietario. Qualsiasi evento previsto che rilascia i Task del progetto deve rilasciare anche lui: hook a riposo, fine comando o chiusura di un terminale dell’agente, e fine turno, interruzione o chiusura di una conversazione Trama della chat applicabile. Un terminale valido conserva invece la propria presa e Cursor conserva la propria. Questa regola non introduce alcun rilascio per quiete e non cambia l’attribuzione degli annunci, che può legittimamente essere alla chat generica.

## Chosen option

**Normalize unrecognized ownership in the Task domain**

Il dominio dei Task considera senza proprietario ogni presa ricevuta dalla chat generica, perché solo Cursor può essere riconosciuto come agente di chat che prende un Task. Si mantiene la stessa provenienza dei comandi per gli altri elementi del Sistema. Costo: aggiornare la normalizzazione della presa e la lettura dei Task già attribuiti alla chat generica, verificando che il rilascio di Copilot e quello di Cursor liberino entrambi le prese senza proprietario.

## Where in the code

src/cli/main.ts: run; src/core/announcements.ts: originFromEnv; src/cli/commands.ts: task move; src/core/work.ts: holderOf, moveTask, releaseTasks; extension/src/host/agent.ts: releaseTakenTasks e gli eventi terminale/chat. test/workflow.test.ts e test/host-agent-terminals.test.ts: i casi senza proprietario costruiscono la presa direttamente nel dominio, senza attraversare il riconoscimento della riga di comando.
