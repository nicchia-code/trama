---
created: 2026-10-23T14:34:47.601Z
updated: 2026-10-23T14:34:47.601Z
summary: omp Chat è accesa per default nella sola barra laterale secondaria e chiede i permessi in conversazione, con l'impostazione omp Chat Approval.
tasks:
  - 41zxoai3
  - pmtfgaro
---
# omp Chat in sidebar con permessi

omp Chat non dipende più dall'agente né dall'editor: è in uso salvo `trama.ompChat` spenta dall'utente, con un solo contenitore nella barra laterale secondaria. La nuova impostazione `trama.ompChatApproval` (`ask` di default, `yolo`) decide se omp chiede i permessi nel riquadro della conversazione o se parte con `--yolo`.
