---
column: done
technical: false
refs:
  - proposal/Open
  - requirements/rules#proposal
drift: null
proposal: null
agent: false
created: 2026-10-14T10:09:55.516Z
finished: 2026-10-14T10:13:46.215Z
---
# Show why a resolution with unfixable Drifts cannot be approved in trama validate --proposal

Quando una risoluzione aperta contiene un Drift da correggere nel codice che, con la risoluzione applicata, non ha più nessun elemento del Modello a cui riferirsi, `trama validate --proposal <id>` deve riportare il motivo fra gli errori della validazione, nominando ogni Drift coinvolto. Lo stesso motivo deve comparire in `trama proposal show` e nel pannello, e l'approvazione resta bloccata con la stessa spiegazione. Oggi la validazione non lo riporta: il controllo è fatto solo dall'approvazione e da `proposal show`.
