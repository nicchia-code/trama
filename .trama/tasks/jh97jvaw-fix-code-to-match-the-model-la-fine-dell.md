---
column: done
technical: false
refs:
  - drift-resolution/Free/developer.ASK_AGENT
  - drift-resolution/Running tasks/editor-chat.AGENT_STOPPED
  - drift-resolution/Running tasks/editor-chat.AGENT_INTERRUPTED
  - drift-resolution/Running tasks/editor-chat.CONVERSATION_CLOSED
  - drift-resolution/Resolving/editor-chat.AGENT_STOPPED
  - drift-resolution/Resolving/editor-chat.AGENT_INTERRUPTED
  - drift-resolution/Resolving/editor-chat.CONVERSATION_CLOSED
  - requirements/rules#drift-resolution
drift: w1955qcf
proposal: null
agent: false
created: 2026-10-10T14:15:26.842Z
finished: 2026-10-10T17:28:12.478Z
---
# Fix code to match the Model: La fine della chat durante l'invio lascia il lavoro in corso

## What happens

Nella chat di Cursor, se la conversazione inviata da Trama comincia e termina mentre il comando di invio non è ancora tornato, il suo evento di fine viene perso. Quando l’invio torna riuscito, il Run o Resolve Drifts viene segnato in corso senza la conversazione già finita. Anche un primo prompt ricevuto durante l’invio viene dimenticato se l’invio termina oltre dieci secondi dopo quel prompt. Il lavoro resta quindi in corso senza poter riconoscere la fine della propria conversazione.

## What should happen

Il lavoro realmente inviato deve legarsi al primo PROMPT_SUBMITTED di Trama del progetto successivo all’inizio dell’invio e riconoscere la fine di quella conversazione, anche se gli hook arrivano prima che l’invio restituisca il suo esito. Se la conversazione è già finita, il lavoro non deve rimanere in Running tasks o Resolving. Un ritardo del comando di invio non deve cancellare il legame; la fine di un’altra conversazione resta irrilevante e un invio non riuscito non apre un lavoro.

## Chosen option

**Conservare il ciclo della conversazione durante l’invio**

Tenere il primo prompt candidato e l’eventuale fine della sua conversazione fino all’esito dell’invio. Quando l’invio riesce, associare il lavoro a quel ciclo: se è già terminato, il lavoro è già concluso. Non eliminare il candidato per il tempo trascorso durante l’invio. Richiede seguire anche le conversazioni concluse mentre l’invio è ancora pendente.

## Where in the code

extension/src/host/agent.ts: launchAgent, ramo chat; extension/src/host/drift-resolution.ts: startJob, takePendingChat, bindChatJob, endChatJobs
