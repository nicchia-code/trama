---
column: done
technical: false
refs:
  - drift-resolution/Running tasks/terminal.COMMAND_ENDED
  - drift-resolution/Resolving/terminal.COMMAND_ENDED
  - requirements/rules#drift-resolution
  - requirements/tech#agent-hook
drift: gbqxvyb2
proposal: null
agent: false
created: 2026-10-10T14:15:26.791Z
finished: 2026-10-10T16:51:40.333Z
---
# Fix code to match the Model: La fine del comando di un agente con hook non conclude il lavoro

## What happens

Quando termina il comando che Trama ha inviato a un terminale seguito dall’hook, i Task presi vengono liberati e gli annunci ritirati, ma il Run o Resolve Drifts resta in corso. Se l’agente esce senza inviare il riposo, la Machine non torna a Free con la fine del comando: continua a bloccare il lavoro incompatibile fino a un’altra causa di conclusione.

## What should happen

La fine del comando inviato da Trama deve concludere il lavoro di quel terminale anche quando l’agente dispone di un hook: è il segnale di riserva quando l’agente esce senza riferire il riposo. Un altro comando non conta. Se era Resolve Drifts, la Machine torna a Free; se era un Run, torna a Free soltanto quando sono finiti anche tutti gli altri Run. La presenza di una Proposal di risoluzione ancora draft o open continua a impedire soltanto un nuovo Resolve Drifts.

## Chosen option

**Applicare la stessa fine comando a tutti i terminali**

Attribuire la fine del comando inviato al lavoro del terminale, indipendentemente dalla presenza dell’hook. Lo stesso evento libera il lavoro e gli altri effetti di fine già previsti; un eventuale riposo successivo non cambia nulla. È la soluzione più semplice e mantiene separati i Run contemporanei senza aspettare un segnale che non arriverà.

## Where in the code

extension/src/host/agent.ts: watchAgentTerminal, ramo isHooked di onDidEndTerminalShellExecution; extension/src/host/drift-resolution.ts: endTerminalJobs
