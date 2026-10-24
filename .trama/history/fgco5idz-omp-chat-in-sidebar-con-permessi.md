---
created: 2026-10-23T14:34:47.601Z
updated: 2026-10-23T14:34:47.601Z
summary: omp Chat è accesa per default nella sola barra laterale secondaria e chiede i permessi in conversazione, con l'impostazione omp Chat Approval.
tasks:
  - 41zxoai3
  - pmtfgaro
cleared:
  pmtfgaro:
    title: Approvazione dei permessi in omp Chat
    proposal: nr388hz3
    tag: Solo omp
    finished: 2026-10-23T14:06:59.548Z
    refs:
      - omp-chat-conversation
      - requirements/rules#omp-chat-conversation
      - requirements/tech#omp-chat-conversation
      - requirements/ui#omp-chat-conversation
      - requirements/quality#omp-chat-conversation
  41zxoai3:
    title: omp Chat accesa, solo sidebar
    proposal: nr388hz3
    tag: Solo omp
    finished: 2026-10-23T14:04:13.401Z
    refs:
      - omp-chat
      - requirements/rules#omp-chat
      - requirements/tech#omp-chat
      - requirements/ui#omp-chat
---
# omp Chat in sidebar con permessi

omp Chat non dipende più dall'agente né dall'editor: è in uso salvo `trama.ompChat` spenta dall'utente, con un solo contenitore nella barra laterale secondaria. La nuova impostazione `trama.ompChatApproval` (`ask` di default, `yolo`) decide se omp chiede i permessi nel riquadro della conversazione o se parte con `--yolo`.
