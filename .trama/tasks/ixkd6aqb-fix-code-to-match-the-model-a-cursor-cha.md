---
column: done
technical: false
refs:
  - drift-resolution/Running tasks/cursor-chat.AGENT_STOPPED
  - drift-resolution/Resolving/cursor-chat.AGENT_STOPPED
  - requirements/rules#drift-resolution
drift: dd3lei9s
proposal: null
agent: false
created: 2026-10-10T08:32:21.886Z
finished: 2026-10-10T08:34:08.628Z
---
# Fix code to match the Model: A Cursor chat job can bind the conversation of an instruction sent just before it

## What happens

Con la chat di Cursor, un Run o Resolve Drifts si lega alla **più vecchia conversazione di Trama nata nei dieci secondi prima** che il lavoro sia registrato e non ancora legata, anche se è partita **prima del suo invio**.

- Una scansione automatica dopo un'approvazione, una scansione o un design mandati alla chat poco prima lasciano una conversazione in attesa: il Run o la risoluzione inviati subito dopo la prendono al posto della propria.
- Il lavoro finisce allora con la fine di turno di quella conversazione, mentre il suo agente lavora ancora: Resolve Drifts torna usabile durante un Run, o i Run durante una risoluzione; la fine della sua vera conversazione non conta più.

## What should happen

Un lavoro nella chat di Cursor è legato alla **conversazione di Trama che parte subito dopo il suo invio**, e finisce solo con la fine di turno, l'interruzione o la chiusura di quella; la fine di un'altra conversazione di Trama, anche di un altro lavoro o di un'istruzione che non è un lavoro, non conta.

Running tasks torna in Free alla fine della conversazione dell'ultimo Run ancora in corso, Resolving alla fine della conversazione di Resolve Drifts, e l'esclusione fra Run e Resolve Drifts tiene finché quell'agente lavora.

## Chosen option

**Bind only conversations born after the send began**

Trama ricorda l'istante in cui comincia l'invio di un lavoro alla chat e gli lega solo una conversazione di Trama il cui primo prompt arriva da quel momento in poi; quelle nate prima, di scansioni o design, non sono mai candidate. Allinea il codice al Modello e a `rules#drift-resolution` senza cambiarli. Costo: un istante in più da ricordare per ogni invio.

## Where in the code

`extension/src/host/drift-resolution.ts` (`bindChatJob`, `takePendingChat`, `startJob`); `extension/src/host/agent.ts` (`launchAgent`, ramo della chat)
