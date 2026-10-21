---
technical: false
refs:
  - editor-chat
  - requirements/tech#editor-chat
---
# sessionEnd come interruzione

Nella chat di Cursor `sessionEnd` con motivo `aborted` o `error`, per una conversazione di Trama, è `editor-chat.AGENT_INTERRUPTED`: il turno è finito perché è stato interrotto o è andato in errore, così uno `stop` perso ha una seconda occasione. Le conseguenze sono quelle di `AGENT_INTERRUPTED` per ciò che appartiene a quella conversazione e alla chat del progetto: lavoro finito, Task presi rilasciati, annunci ritirati con l'avviso, schede in attesa liberate, e l'Advisor della chat che finisce come per ogni interruzione. Quando lo `stop` era già arrivato non cambia nulla, perché i segnali ripetuti sono idempotenti; quando invece la fine arriva soltanto da `sessionEnd` compare anche l'avviso `Trama stopped following <lavoro>: Cursor ended the session (<motivo>).` (`ui#time`). `sessionEnd` con `window_close` o `user_close` resta `CONVERSATION_CLOSED`; con `completed` o un altro motivo non produce nulla. La traduzione sta in `CursorConversations.translate` di `src/core/cursor-chat.ts`.
