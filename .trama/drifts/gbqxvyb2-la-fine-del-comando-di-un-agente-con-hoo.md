---
status: resolved
resolution: fix-code
refs:
  - drift-resolution/Running tasks/terminal.COMMAND_ENDED
  - drift-resolution/Resolving/terminal.COMMAND_ENDED
  - requirements/rules#drift-resolution
  - requirements/tech#agent-hook
proposal: null
task: zwvgtera
origin: null
option: 1
note: null
resolvedBy: 5mztm9sl
created: 2026-10-10T12:48:42.652Z
---
# La fine del comando di un agente con hook non conclude il lavoro

## What happens

Quando termina il comando che Trama ha inviato a un terminale seguito dall’hook, i Task presi vengono liberati e gli annunci ritirati, ma il Run o Resolve Drifts resta in corso. Se l’agente esce senza inviare il riposo, la Machine non torna a Free con la fine del comando: continua a bloccare il lavoro incompatibile fino a un’altra causa di conclusione.

## What should happen

La fine del comando inviato da Trama deve concludere il lavoro di quel terminale anche quando l’agente dispone di un hook: è il segnale di riserva quando l’agente esce senza riferire il riposo. Un altro comando non conta. Se era Resolve Drifts, la Machine torna a Free; se era un Run, torna a Free soltanto quando sono finiti anche tutti gli altri Run. La presenza di una Proposal di risoluzione ancora draft o open continua a impedire soltanto un nuovo Resolve Drifts.

## Fix options

### Applicare la stessa fine comando a tutti i terminali

Attribuire la fine del comando inviato al lavoro del terminale, indipendentemente dalla presenza dell’hook. Lo stesso evento libera il lavoro e gli altri effetti di fine già previsti; un eventuale riposo successivo non cambia nulla. È la soluzione più semplice e mantiene separati i Run contemporanei senza aspettare un segnale che non arriverà.

### Usare la fine comando come riserva del riposo

Per i terminali con hook distinguere il riposo già ricevuto dall’uscita senza riposo e concludere il lavoro in quest’ultimo caso. Entrambi i percorsi portano agli stessi effetti, senza coinvolgere altri terminali. Rende esplicito il ruolo di riserva della fine comando, al costo di conservare una distinzione aggiuntiva per ogni lavoro.

## Where in the code

extension/src/host/agent.ts: watchAgentTerminal, ramo isHooked di onDidEndTerminalShellExecution; extension/src/host/drift-resolution.ts: endTerminalJobs
