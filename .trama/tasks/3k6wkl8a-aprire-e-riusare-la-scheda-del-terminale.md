---
column: done
technical: false
refs:
  - agent-terminal
  - agent-terminal/No agent terminal/developer.ASK_AGENT
  - agent-terminal/Agent idle/developer.ASK_AGENT
  - requirements/tech#agent-terminal
  - requirements/ui#agent-terminal
drift: null
proposal: w9fcrqg5
agent: false
created: 2026-10-05T18:32:53.657Z
---
# Aprire e riusare la scheda del terminale senza toglierle il focus

Con il launcher «terminal-tab», quando Trama apre una scheda nuova o riusa quella libera, la scheda viene in primo piano nel suo gruppo ma non prende il focus: il cursore e la tastiera restano nell'editor o nel pannello dove erano.

Poiché il gruppo attivo non dice più dove è finita la scheda, la colonna in cui Trama l'ha aperta si ricorda dalla prima apertura di una scheda di terminale con l'etichetta uguale al nome del terminale, dopo la creazione. Una scheda nuova, mentre la precedente è ancora aperta e il suo gruppo esiste, si apre in quel gruppo; altrimenti accanto al gruppo attivo. Se il developer sposta la scheda, Trama non lo segue.

Il launcher «terminal» nell'area dei terminali e i terminali dei worktree non cambiano.
