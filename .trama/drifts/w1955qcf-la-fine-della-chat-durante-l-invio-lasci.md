---
status: resolved
resolution: fix-code
refs:
  - drift-resolution/Free/developer.ASK_AGENT
  - drift-resolution/Running tasks/editor-chat.AGENT_STOPPED
  - drift-resolution/Running tasks/editor-chat.AGENT_INTERRUPTED
  - drift-resolution/Running tasks/editor-chat.CONVERSATION_CLOSED
  - drift-resolution/Resolving/editor-chat.AGENT_STOPPED
  - drift-resolution/Resolving/editor-chat.AGENT_INTERRUPTED
  - drift-resolution/Resolving/editor-chat.CONVERSATION_CLOSED
  - requirements/rules#drift-resolution
proposal: null
task: jh97jvaw
origin: null
option: 1
note: null
resolvedBy: 5mztm9sl
created: 2026-10-10T12:49:35.984Z
---
# La fine della chat durante l'invio lascia il lavoro in corso

## What happens

Nella chat di Cursor, se la conversazione inviata da Trama comincia e termina mentre il comando di invio non è ancora tornato, il suo evento di fine viene perso. Quando l’invio torna riuscito, il Run o Resolve Drifts viene segnato in corso senza la conversazione già finita. Anche un primo prompt ricevuto durante l’invio viene dimenticato se l’invio termina oltre dieci secondi dopo quel prompt. Il lavoro resta quindi in corso senza poter riconoscere la fine della propria conversazione.

## What should happen

Il lavoro realmente inviato deve legarsi al primo PROMPT_SUBMITTED di Trama del progetto successivo all’inizio dell’invio e riconoscere la fine di quella conversazione, anche se gli hook arrivano prima che l’invio restituisca il suo esito. Se la conversazione è già finita, il lavoro non deve rimanere in Running tasks o Resolving. Un ritardo del comando di invio non deve cancellare il legame; la fine di un’altra conversazione resta irrilevante e un invio non riuscito non apre un lavoro.

## Fix options

### Conservare il ciclo della conversazione durante l’invio

Tenere il primo prompt candidato e l’eventuale fine della sua conversazione fino all’esito dell’invio. Quando l’invio riesce, associare il lavoro a quel ciclo: se è già terminato, il lavoro è già concluso. Non eliminare il candidato per il tempo trascorso durante l’invio. Richiede seguire anche le conversazioni concluse mentre l’invio è ancora pendente.

### Seguire il lavoro dal primo prompt durante l’invio

Preparare l’associazione prima di avviare l’invio e confermare il lavoro quando arriva il primo prompt pertinente. Da quel momento la fine della conversazione può concluderlo subito, senza aspettare il ritorno del comando di invio. Se l’invio fallisce o lascia solo un’istruzione pronta, annullare la preparazione. Richiede distinguere il tentativo d’invio dal lavoro realmente partito.

## Where in the code

extension/src/host/agent.ts: launchAgent, ramo chat; extension/src/host/drift-resolution.ts: startJob, takePendingChat, bindChatJob, endChatJobs
