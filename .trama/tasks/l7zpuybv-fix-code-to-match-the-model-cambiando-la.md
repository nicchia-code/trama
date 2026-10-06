---
column: done
technical: false
refs:
  - agent-terminal/Agent running/developer.ASK_AGENT
  - requirements/rules#agent-terminal
drift: dhr3j2qm
proposal: null
agent: false
created: 2026-10-06T18:32:42.101Z
finished: 2026-10-06T18:44:47.282Z
---
# Fix code to match the Model: Cambiando launcher mentre l'agente lavora, il terminale vecchio resta seguito

## What happens

Trama segue **separatamente** il terminale integrato (anche come scheda) e la finestra esterna. Se il developer cambia launcher tra integrato ed esterno mentre l'agente lavora, la nuova istruzione apre un terminale dell'altro tipo ma il vecchio resta seguito:

- quando il comando del vecchio terminale finisce, nasce comunque l'**avviso di fine comando**, anche se l'agente nuovo sta ancora lavorando;
- il vecchio terminale torna libero e può essere riusato in seguito, anche se non è più l'ultimo terminale avviato.

## What should happen

Trama ricorda solo l'**ultimo terminale** che ha avviato. In Agent running, `developer.ASK_AGENT` apre un terminale nuovo e il vecchio non è più seguito: la sua fine rilascia i Task che ha preso e ritira i suoi annunci, ma non manda avvisi sulla fine e non cambia lo stato dell'agente. Questo vale qualunque sia il launcher del terminale nuovo, integrato o esterno.

## Chosen option

**Un solo terminale seguito per tutti i launcher del terminale**

Ogni istruzione scritta davvero in un terminale, integrato o finestra esterna, diventa l'unico terminale seguito: il precedente dell'altro tipo smette di contare per la fine del comando e per il riuso. La sua fine rilascia solo i suoi Task e annunci, senza avvisi. Costo: unire il tracciamento dei due tipi di terminale in un unico "ultimo terminale".

## Where in the code

`extension/src/host/agent.ts`: `launchAgent` (terminale integrato, `lastTerminal`/`commandRunning`) e `launchExternal`/`watchExternalRuns` (finestre esterne, `ExternalRuns` in `extension/src/host/external-terminal.ts`) non si azzerano a vicenda.
