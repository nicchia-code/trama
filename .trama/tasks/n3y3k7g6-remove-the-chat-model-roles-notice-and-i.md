---
column: done
technical: false
refs:
  - agent-terminal
  - requirements/rules#agent-launching
  - requirements/tech#agent-launching
  - requirements/ui#agent-launching
drift: null
proposal: dtpkqiid
agent: false
created: 2026-10-11T08:38:05.842Z
finished: 2026-10-11T08:43:17.647Z
---
# Remove the chat model roles notice and its globalState key

Un'istruzione verso la chat non mostra più nulla per i ruoli dei modelli: sparisce l'avviso informativo che diceva che i ruoli valgono solo per gli agenti del terminale e la sua memoria una tantum per tutti i progetti (la chiave `trama.chatModelRolesNoticeShown`). Un valore rimasto in quella chiave non è letto né cancellato. L'unico avviso legato ai ruoli in chat è quello del modello non trovato in Copilot. Va tolto anche ciò che serviva soltanto a ricordare l'avviso.
