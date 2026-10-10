---
status: resolved
resolution: fix-code
refs:
  - agent-terminal/Agent idle
  - agent-hook.IDLE
  - terminal.COMMAND_ENDED
  - requirements/tech#agent-hook
  - requirements/rules#agent-terminal
proposal: null
task: 0ny9bqvh
origin: null
option: 1
note: null
resolvedBy: 5mztm9sl
created: 2026-10-10T12:49:48.113Z
---
# Il terminale a riposo continua a essere seguito

## What happens

Dopo il primo hook a riposo il terminale rimane nell'elenco dei terminali seguiti. Un successivo hook a riposo viene ancora elaborato; anche la fine del comando e la chiusura attraversano nuovamente i gesti di fine lavoro. L'hook non viene ignorato nemmeno quando la sua identità non corrisponde più a un terminale seguito. Il lavoro che il developer riprende a mano nello stesso terminale non è quindi separato dalla corsa già conclusa.

## What should happen

Con autoExit spento, il primo segnale di fine porta il terminale in Agent idle e Trama smette di seguirne il lavoro. Un nuovo prompt scritto a mano non riapre la corsa; gli hook successivi e la fine del comando non producono altri effetti di fine lavoro. Anche un hook da un terminale già chiuso si ignora. La chiusura del terminale a riposo lo porta soltanto in Closed.

## Fix options

### Terminare la sorveglianza al primo segnale

Il primo hook a riposo o la fine del comando conclude definitivamente la corsa di quel terminale. Ogni successivo segnale è ignorato, mentre il terminale rimasto aperto può essere usato liberamente dal developer senza tornare seguito da Trama. La chiusura successiva completa soltanto la vita del terminale, senza ripetere gli effetti della conclusione.

### Seguire anche il lavoro ripreso a mano

Cambiare Modello e Requisiti per considerare un prompt manuale come l'avvio di una nuova corsa nel terminale aperto, con un segnale esplicito che la distingua da quella finita. Permette di continuare sotto sorveglianza, ma richiede una nuova transizione di avvio e la separazione degli eventi tardivi invece di trattare ogni hook successivo come ancora valido.

## Where in the code

extension/src/host/agent.ts: watchAgentTerminal, agentTerminals; extension/src/host/drift-resolution.ts: receiveAgentIdle; extension/src/host/questions.ts: onAgentIdle
