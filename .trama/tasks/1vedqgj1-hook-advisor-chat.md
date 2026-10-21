---
column: done
technical: false
refs:
  - editor-chat.FILES_CHANGED
  - editor-chat.TOOL_FINISHED
  - editor-chat.SUBAGENT_STOPPED
  - editor-chat.SUBAGENT_INTERRUPTED
  - editor-chat.TURN_FINISHING
  - requirements/tech#chat-advisor
drift: null
proposal: n97kq4ls
agent: false
created: 2026-10-21T11:33:12.145Z
finished: 2026-10-21T11:40:18.661Z
---
# Hook e stato dell'Advisor chat

`writeCursorHooks` (`src/core/cursor-chat.ts`) scrive in `~/.cursor/hooks.json`, riconosciute come le altre voci di Trama e tutte con il comando `hook cursor`: `afterFileEdit`, `postToolUse`, `subagentStart`, `subagentStop` con `"loop_limit": null`, una seconda `afterShellExecution` senza `matcher` accanto a quella con `"matcher": "trama"`, e `stop` con `"loop_limit": null`; il limite delle tre richieste lo conta l'host.

Ogni finestra dell'editor in Cursor scrive, accanto alle registrazioni locali delle finestre e fuori da ogni repository, un file di stato JSON (file provvisorio poi rinominato, a ogni cambio; cancellato alla chiusura) con solo: cartella del progetto, conversazioni di Trama con il loro lavoro, chiamate di sotto-agenti con la conversazione che le ha lanciate, e per ogni agente guardato la sua identità e il segno «c'è un testo da consegnare». Mai prompt, comandi, percorsi o note. Gli hook (`hookAnswer`) lo leggono senza contattare l'editor e contattano la finestra solo se la conversazione o l'agente la riguarda.

Traduzione negli eventi:
- `afterFileEdit` per un agente guardato manda il percorso relativo al progetto: `FILES_CHANGED`; altrimenti esce senza contattare nessuno.
- `afterShellExecution` senza matcher, per un agente guardato, esegue `git status --porcelain=v1 -z` (limite 2 s) e manda percorsi con l'impronta `git hash-object` (assente se tolto); l'host conta come `FILES_CHANGED` solo percorsi nuovi o con impronta diversa dall'ultima fotografia di quell'agente. Senza git o se git non risponde non manda nulla. `.trama/` e i file installati da Trama sono esclusi come per l'impronta del codice.
- `postToolUse`: se il file di stato segna un testo da consegnare chiede il testo (limite 1 s) e risponde `{"additional_context": "<testo>"}`, che l'host considera consegnato quando risponde: `TOOL_FINISHED`. Altrimenti `{}`.
- `subagentStart`: per una conversazione di Trama manda `parent_conversation_id`, `subagent_type` e l'identità della chiamata, perché l'host leghi il sotto-agente; risponde sempre `{"permission": "allow"}`.
- `subagentStop` per un sotto-agente guardato: `status` `completed` è `SUBAGENT_STOPPED`, gli altri `SUBAGENT_INTERRUPTED`; manda anche `modified_files` e `child_conversation_id`, aspetta fino a 5 s e risponde con il `followup_message` dell'host o `{}`.
- `stop` per una conversazione con Advisor della chat è `TURN_FINISHING`: aspetta fino a 5 s (timeout in `src/core/question-channel.ts`) e risponde con il `followup_message` quando l'host continua il turno; senza risposta in tempo risponde `{}` e l'host conta la fine come `AGENT_STOPPED` con motivo `the turn ended before Trama could ask for it`.

Oltre al file di stato nulla si scrive su disco.
