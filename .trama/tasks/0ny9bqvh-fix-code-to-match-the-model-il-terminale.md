---
column: done
technical: false
refs:
  - agent-terminal/Agent idle
  - agent-hook.IDLE
  - terminal.COMMAND_ENDED
  - requirements/tech#agent-hook
  - requirements/rules#agent-terminal
drift: y6gszl94
proposal: null
agent: false
created: 2026-10-10T14:15:26.849Z
finished: 2026-10-10T16:22:32.091Z
---
# Fix code to match the Model: Il terminale a riposo continua a essere seguito

## What happens

Dopo il primo hook a riposo il terminale rimane nell'elenco dei terminali seguiti. Un successivo hook a riposo viene ancora elaborato; anche la fine del comando e la chiusura attraversano nuovamente i gesti di fine lavoro. L'hook non viene ignorato nemmeno quando la sua identità non corrisponde più a un terminale seguito. Il lavoro che il developer riprende a mano nello stesso terminale non è quindi separato dalla corsa già conclusa.

## What should happen

Con autoExit spento, il primo segnale di fine porta il terminale in Agent idle e Trama smette di seguirne il lavoro. Un nuovo prompt scritto a mano non riapre la corsa; gli hook successivi e la fine del comando non producono altri effetti di fine lavoro. Anche un hook da un terminale già chiuso si ignora. La chiusura del terminale a riposo lo porta soltanto in Closed.

## Chosen option

**Terminare la sorveglianza al primo segnale**

Il primo hook a riposo o la fine del comando conclude definitivamente la corsa di quel terminale. Ogni successivo segnale è ignorato, mentre il terminale rimasto aperto può essere usato liberamente dal developer senza tornare seguito da Trama. La chiusura successiva completa soltanto la vita del terminale, senza ripetere gli effetti della conclusione.

## Where in the code

extension/src/host/agent.ts: watchAgentTerminal, agentTerminals; extension/src/host/drift-resolution.ts: receiveAgentIdle; extension/src/host/questions.ts: onAgentIdle
