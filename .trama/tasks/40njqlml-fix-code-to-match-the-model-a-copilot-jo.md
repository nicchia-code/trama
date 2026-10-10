---
column: done
technical: false
refs:
  - drift-resolution/Free/developer.ASK_AGENT
  - drift-resolution/Running tasks/editor-chat.AGENT_STOPPED
  - drift-resolution/Resolving/editor-chat.AGENT_STOPPED
  - requirements/rules#drift-resolution
drift: s63mw4hv
proposal: null
agent: false
created: 2026-10-10T18:26:06.313Z
finished: 2026-10-10T18:36:26.051Z
---
# Fix code to match the Model: A Copilot job can bind a conversation started during chat preparation

## What happens

Nella chat di Copilot, Trama considera candidate per un Run o Resolve Drifts anche le conversazioni di Trama che iniziano **mentre prepara la nuova chat, prima di inviare l’istruzione**. Se nello stesso progetto il developer avvia intanto una scansione o un design nella chat, il lavoro successivamente inviato può legarsi a quella conversazione anziché alla propria. La sua fine libera Running tasks o Resolving mentre l’agente del lavoro continua; se quella conversazione è già terminata durante la preparazione, il lavoro non risulta neppure in corso dopo la consegna. La fine della vera conversazione non corregge il legame.

## What should happen

Un lavoro nella chat deve legarsi **solo al primo prompt di Trama del progetto successivo all’invio effettivo della propria istruzione**. Preparare una nuova chat non costituisce ancora un invio: conversazioni iniziate durante tale attesa non devono diventare proprietarie del lavoro. Dopo il legame, soltanto la fine della conversazione associata conclude quel lavoro; la fine di una scansione o di un design iniziati prima della consegna non deve liberare l’esclusione fra Run e Resolve Drifts. Restano validi gli eventi della vera conversazione che arrivano durante il comando di invio, prima che ne sia restituito l’esito.

## Chosen option

**Start conversation matching at actual delivery**

Far iniziare la ricerca della conversazione proprietaria soltanto quando l’istruzione viene effettivamente consegnata alla chat, dopo la preparazione. I prompt precedenti restano esclusi, mentre il primo prompt e l’eventuale fine della vera conversazione possono essere conservati fino all’esito della consegna. È la correzione raccomandata: mantiene Model, esclusione e ripiego negli appunti; costa separare il momento della preparazione da quello dell’invio.

## Where in the code

extension/src/host/agent.ts: launchAgent registra sentAt prima di openChat; openChat attende workbench.action.chat.newChat prima della consegna. extension/src/host/drift-resolution.ts: bindChatJobFor, pendingChats, takePendingChat, startJob ed endChatJobsFor. extension/src/host/copilot-chat.ts: receiveCopilotHook.
