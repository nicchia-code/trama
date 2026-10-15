---
technical: false
refs:
  - drift-resolution
  - requirements/rules#drift-resolution
---
# Treat a fix Task closed without changes as a success in the automatic Run

- Nel Run automatico, un Task di correzione chiuso senza modifiche è un esito riuscito: non diventa un caso fallito, non porta il badge `autopilot failed` e la sua origine entra nel Run come dopo ogni correzione Done; il ciclo prosegue.
- La parte del Run automatico della skill distribuita `trama-implement` dice di non segnalarlo con `trama agent-event failed`.
- La risoluzione automatica continua a non leggere il codice e non c'è un limite al numero di Fix Task di una raccolta: nulla cambia lì.
- Un test dell'host copre una raccolta in cui un Fix Task chiuso senza modifiche sblocca la sua origine senza casi falliti.
