---
status: resolved
resolution: dismissed
refs:
  - drift-resolution/Running tasks/agent-hook.IDLE
  - drift-resolution/Resolving/agent-hook.IDLE
  - requirements/rules#drift-resolution
proposal: null
task: null
origin: null
option: null
note: null
resolvedBy: vaoulrok
created: 2026-10-10T15:43:08.040Z
---
# External agent idle does not finish its Run or resolution

## What happens

Un Run o Resolve Drifts lanciato in una finestra del terminale esterno resta **in corso anche quando il suo agente riferisce il riposo**. Il segnale arriva alla finestra dell’editor, ma conclude soltanto i lavori dei terminali integrati. Di conseguenza Resolve Drifts o i Run incompatibili rimangono bloccati nonostante il lavoro esterno sia già finito. Questo è distinto dalla conclusione per inattività e dalla mancata conclusione alla fine del comando: qui manca la reazione al segnale esplicito di riposo.

## What should happen

Il riposo riferito dall’agente deve concludere **il lavoro del terminale che lo riferisce**, anche quando Trama lo ha lanciato in una finestra esterna. Resolve Drifts lascia Resolving; un Run lascia Running tasks soltanto quando sono finiti anche tutti gli altri Run. Terminali e conversazioni diversi non devono cambiare. Un segnale successivo di fine dello stesso lavoro non produce un’altra conclusione. L’eventuale Proposal di risoluzione ancora in scrittura o aperta continua a impedire soltanto un nuovo Resolve Drifts.

## Fix options

### Follow external idle in the terminal lifecycle

Seguire il riposo dei lavori esterni insieme a quello dei lavori integrati, usando l’identità del terminale lanciato da Trama. Il primo segnale esplicito conclude soltanto quella corsa e i segnali successivi non la concludono di nuovo. Mantiene un solo percorso di fine per ciascun terminale; richiede che anche le finestre esterne conservino il riferimento alla corsa fino al suo primo segnale di fine.

### Let each launched job consume its own idle event

Far riconoscere direttamente a ciascun Run o Resolve Drifts il riposo del proprio terminale, indipendentemente dal launcher. Il lavoro conclude la sua partecipazione all’esclusione mentre la gestione della finestra esterna continua a seguire separatamente la fine del comando. Evita di ampliare il ciclo del terminale integrato, ma richiede separare chiaramente conclusione del lavoro e disponibilità della finestra per il riuso.

## Where in the code

extension/src/host/agent.ts: startExternalRun, watchAgentTerminal callback onAgentIdle, watchExternalRuns; extension/src/host/drift-resolution.ts: receiveAgentIdle, startJob, endTerminalJobs; extension/src/host/questions.ts: onAgentIdle
