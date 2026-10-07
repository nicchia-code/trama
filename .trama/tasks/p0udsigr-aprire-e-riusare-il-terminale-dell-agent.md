---
column: done
technical: false
refs:
  - agent-terminal
  - requirements/tech#agent-terminal
  - requirements/ui#agent-terminal
drift: null
proposal: 73u7wm8w
agent: false
created: 2026-10-07T05:32:05.395Z
finished: 2026-10-07T05:42:34.706Z
---
# Aprire e riusare il terminale dell'agente nell'area dei terminali senza mostrarlo

Con il launcher «terminal», e con «auto» fuori da Cursor, il terminale dell'agente che Trama apre o riusa non si mostra: l'area dei terminali non si apre se è chiusa, il terminale visibile al suo interno resta quello che era, e cursore e tastiera restano nell'editor o nel pannello in cui erano. Oggi Trama mostra il terminale e gli dà il focus a ogni avvio. Vale per ogni avvio: pulsanti (design, scansione, implementazione, import, rifacimento di una Proposal obsoleta), scansione automatica dopo un'approvazione, «Scan now» e Hold scan spento. Il terminale resta nell'elenco dei terminali con il suo nome, da dove il developer lo apre a mano. Con «terminal-tab» nulla cambia: la scheda continua a venire in primo piano nel suo gruppo senza focus. Fatto quando nessun terminale dell'agente nell'area dei terminali viene più mostrato né prende il focus, e le verifiche esistenti lo confermano.
