---
column: done
technical: false
refs:
  - drift-resolution/Running tasks
  - requirements/rules#drift-resolution
  - requirements/tech#drift-resolution
drift: null
proposal: null
agent: false
created: 2026-10-11T10:27:23.584Z
finished: 2026-10-11T10:44:04.769Z
---
# Let the automatic Run instruction follow the authorized Tasks at every group

L'istruzione del Run automatico oggi nomina, nel filtro dei Task, soltanto i Task autorizzati al momento del lancio: le origini ancora bloccate dalle loro correzioni non ci sono, e un agente che segue la frase alla lettera non le avvia mai. Quando è finita, ogni origine ancora da completare, la cui correzione è Done, deve poter entrare nel Run. Il Run deve ricavare i Task autorizzati da `trama drift autopilot --json` prima di ogni gruppo e usare quell'elenco aggiornato, non quello del lancio. L'istruzione non deve più portare un elenco fisso di identità. Resta valido tutto il resto: nessun ripiego sulla coda generale, nessun Task estraneo, nessuna origine già Done riaperta, e il controllo della delega prima di ogni gruppo.
