---
column: done
technical: false
refs:
  - agent-launching
  - requirements/rules#agent-launching
  - requirements/tech#agent-launching
  - requirements/ui#agent-launching
drift: null
proposal: w2cspsnx
agent: false
created: 2026-10-07T15:00:23.901Z
finished: 2026-10-07T15:08:06.595Z
---
# Warn once that model roles do not apply in the chat

Quando un'istruzione parte con il launcher della chat e almeno un ruolo fra `trama.analysis`, `trama.scan` e `trama.execution` non è vuoto, la prima volta compare il messaggio informativo dei Requisiti `ui`, senza pulsanti; da allora non compare più, per nessun progetto (ricordato in `globalState` con `trama.chatModelRolesNoticeShown`). La chat non riceve mai un modello né la frase dei sotto-agenti.
