---
column: done
technical: false
refs:
  - drift-resolution/Free/developer.ASK_AGENT
  - drift-resolution/Running tasks/editor-chat.AGENT_STOPPED
  - drift-resolution/Resolving/editor-chat.AGENT_STOPPED
  - requirements/data#drift-resolution
  - requirements/rules#drift-resolution
  - requirements/tech#editor-chat
drift: null
proposal: u064bqz0
agent: false
created: 2026-10-10T12:48:54.041Z
finished: 2026-10-10T14:41:53.236Z
---
# Seguire ogni Run e risoluzione nella conversazione della chat dell'editor

Anche nella chat di Copilot, un Run o Resolve Drifts realmente inviato deve essere seguito nella propria conversazione, non soltanto nella chat di Cursor. Il primo PROMPT_SUBMITTED di Trama del progetto dopo l’invio lega il lavoro a quella conversazione. La sua AGENT_STOPPED conclude soltanto quel lavoro: Resolve Drifts lascia Resolving; per i Run, Running tasks resta finché almeno un altro Run è ancora in corso. La fine di una conversazione diversa non libera il lavoro. Il legame e lo State restano nella memoria della finestra e si azzerano riaprendo l’editor. Un’istruzione solo preparata o copiata negli appunti non apre alcun lavoro; senza il legame non si conclude un lavoro per inattività. Una Proposal di risoluzione draft o open continua a impedire un nuovo Resolve Drifts anche dopo la fine dell’agente.
