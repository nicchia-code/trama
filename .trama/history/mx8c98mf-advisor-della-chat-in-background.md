---
created: 2026-10-23T09:20:54.978Z
updated: 2026-10-23T09:20:54.978Z
summary: "L'Advisor della chat di Cursor rivede le modifiche con round di trama-advisor in background: Cursor consegna l'esito, l'agente aspetta solo la revisione del Task e quella finale."
tasks:
  - e0fp573f
  - q6eqvoqj
  - zi0zqcft
cleared:
  zi0zqcft:
    title: Smoke test dei round Cursor
    proposal: hpdjp1mn
    tag: chat-advisor
    finished: 2026-10-23T09:18:18.766Z
    refs:
      - editor-chat.TOOL_FINISHED
      - requirements/quality#editor-chat
  q6eqvoqj:
    title: Round dell'advisor in background
    proposal: hpdjp1mn
    tag: chat-advisor
    finished: 2026-10-23T09:17:28.523Z
    refs:
      - chat-advisor
      - requirements/rules#chat-advisor
      - requirements/tech#chat-advisor
  e0fp573f:
    title: Remove code of chat-advisor/Note in attesa
    proposal: hpdjp1mn
    tag: chat-advisor
    finished: 2026-10-23T09:09:24.088Z
    refs:
      - chat-advisor/Al lavoro
---
# Advisor della chat in background

I round di revisione continua partono in background (`run_in_background`) con la trascrizione dell'agente da una posizione in byte; le note dei round stanno solo in memoria e tornano all'agente nella revisione del Task o finale, e la fase Note in attesa non esiste più. Esiste una sola definizione del sotto-agente trama-advisor. Il test di accettazione R di docs/uat.md controlla i round in background e dichiara Cursor 3.27.6 come prima versione provata.
