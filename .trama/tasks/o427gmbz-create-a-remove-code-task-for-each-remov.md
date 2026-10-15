---
column: done
technical: false
refs:
  - task
  - requirements/rules#task
drift: null
proposal: 2pa6eli4
agent: false
created: 2026-10-14T08:40:55.948Z
finished: 2026-10-14T09:37:31.771Z
---
# Create a Remove code Task for each removed Model element on approval

All'approvazione di una Proposal, per ogni elemento del Modello che la Proposal rimuove e il cui contenitore resta nel Modello, nasce un Task che chiede di togliere il codice di quell'elemento, con il riferimento al contenitore ancora vivo, in To do e legato alla Proposal come gli altri. Una Feature o un Actor rimossi danno invece un Task tecnico senza riferimenti. Le sezioni di Requisiti rimosse non creano Task. Il titolo è Remove code of seguito dal riferimento dell'elemento. Oggi l'approvazione non crea nulla di simile.
