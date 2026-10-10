---
status: resolved
resolution: fix-code
refs:
  - drift-resolution/Running tasks/cursor-chat.AGENT_STOPPED
  - drift-resolution/Running tasks/cursor-chat.AGENT_INTERRUPTED
  - drift-resolution/Running tasks/cursor-chat.CONVERSATION_CLOSED
  - drift-resolution/Resolving/cursor-chat.AGENT_STOPPED
  - drift-resolution/Resolving/cursor-chat.AGENT_INTERRUPTED
  - drift-resolution/Resolving/cursor-chat.CONVERSATION_CLOSED
  - requirements/rules#drift-resolution
  - requirements/data#drift-resolution
proposal: null
task: syboj2ee
origin: null
option: 1
note: null
resolvedBy: b4duwb4w
created: 2026-10-09T20:56:23.511Z
---
# A Trama conversation's turn ending in Cursor's chat ends every Run and Resolve Drifts there

## What happens

Con il launcher della chat di Cursor, un Run o Resolve Drifts lanciato da Trama finisce alla **prima fine di turno, interruzione o chiusura di una qualunque conversazione di Trama** dello stesso progetto, non della sua.

- Se intanto finisce il turno di una richiesta di design o di una scansione in chat, il Run o la risoluzione ancora al lavoro è dato per finito: Resolve Drifts si riabilita mentre un Run lavora, o i Run si riabilitano mentre la risoluzione lavora.
- Con due Run in chat, la fine del primo chiude anche il secondo.

È ciò che dice alla lettera `rules#drift-resolution`.

## What should happen

Il Model segue ogni lavoro **nella sua conversazione**: Running tasks torna in Free quando finisce, si interrompe o si chiude la conversazione dell'ultimo Run ancora in corso, e Resolving quando succede alla conversazione di Resolve Drifts. La fine di un Run mentre un altro continua non cambia nulla.

Anche `data#drift-resolution` vuole che ogni lavoro ricordi la conversazione della chat in cui gira.

## Fix options

### Follow each chat job in its own conversation

Ogni lavoro inviato alla chat di Cursor si lega alla conversazione di Trama che parte subito dopo l'invio, e finisce solo con la fine di turno, l'interruzione o la chiusura di quella. Il codice si allinea al Model e a `data#drift-resolution`; va corretta anche la frase di `rules#drift-resolution`. Costo: legare l'invio alla conversazione giusta quando due invii sono vicini.

### Let any Trama conversation end chat jobs

Si tiene il comportamento di oggi: la fine di qualunque conversazione di Trama dello stesso progetto chiude tutti i lavori in chat. Il Model di Drift resolution e `data#drift-resolution` si cambiano per dirlo, accettando che l'esclusione fra Run e Resolve Drifts in chat possa cadere prima che l'agente abbia finito. Nessun lavoro sul codice.

### End only on the conversations of Runs and resolutions

Una via di mezzo: un lavoro in chat finisce solo con la fine di una conversazione nata da un Run o da Resolve Drifts, non da design, scansioni o import. Toglie il caso più frequente senza legare ogni invio alla sua conversazione; con due Run in chat resta l'approssimazione. Servono un ritocco al codice e al Model.

## Where in the code

`extension/src/host/agent.ts` (`watchAgentTerminal`, gestore degli eventi della chat di Cursor) e `extension/src/host/drift-resolution.ts` (`endChatJobs`, luogo `chat` del job senza conversazione).
