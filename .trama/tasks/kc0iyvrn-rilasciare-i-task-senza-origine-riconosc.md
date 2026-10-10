---
column: done
technical: false
refs:
  - task/Taken by the agent/editor-chat.AGENT_STOPPED
  - requirements/data#task
  - requirements/rules#task
  - requirements/tech#editor-chat
drift: null
proposal: u064bqz0
agent: false
created: 2026-10-10T12:48:32.434Z
finished: 2026-10-10T14:27:13.811Z
---
# Rilasciare i Task senza origine riconosciuta alla fine del turno Copilot

Alla fine di un turno di una conversazione Trama nella chat di Copilot, i Task del progetto presi senza un terminale o una chat riconosciuti devono essere rilasciati subito e tornare in To do. Il rilascio elimina la presa e lascia invariati i Task di un terminale riconosciuto e i Task degli altri progetti. I turni di conversazioni che non sono di Trama non rilasciano nulla. Gli eventi della chat di Copilot devono essere riconosciuti secondo requirements/tech#editor-chat: un prompt Trama identifica la conversazione e Stop produce editor-chat.AGENT_STOPPED. Questo lavoro non deve far prendere i Task ai normali comandi della chat Copilot, che i Requisiti non distinguono da quelli del developer; deve soltanto applicare il rilascio previsto anche ai Task già presi senza origine riconosciuta. Restano corretti i rilasci già disponibili per la chat di Cursor.
