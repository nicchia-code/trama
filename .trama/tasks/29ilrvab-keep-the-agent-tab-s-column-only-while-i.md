---
column: done
technical: false
refs:
  - agent-terminal/Agent running
  - requirements/tech#agent-terminal
  - requirements/ui#agent-terminal
drift: null
proposal: 2pa6eli4
agent: false
created: 2026-10-14T08:42:00.421Z
finished: 2026-10-14T09:34:44.670Z
---
# Keep the agent tab's column only while its terminal is open

Quando Trama apre la scheda del terminale accanto a quella precedente dell'agente, usa la colonna di quella scheda solo se il suo terminale è ancora aperto. Oggi il controllo guarda se il processo del terminale è già terminato: un terminale il cui processo è finito ma la cui scheda è ancora aperta viene trattato come chiuso, e la scheda nuova va accanto al gruppo attivo invece che nel gruppo dell'agente. Va usato solo il fatto che il terminale sia ancora aperto nell'editor; la chiusura del terminale già azzera il ricordo.
