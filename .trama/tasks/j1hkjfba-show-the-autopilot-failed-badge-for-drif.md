---
column: done
technical: false
refs:
  - drift-resolution/Resolving
  - drift-resolution/Resolving/proposal.SUBMITTED
  - requirements/ui#drift-resolution
drift: null
proposal: null
agent: false
created: 2026-10-11T09:48:53.295Z
finished: 2026-10-11T10:16:44.082Z
---
# Show the autopilot failed badge for Drifts inside an open resolution

Quando una risoluzione automatica resta aperta perché l'approvazione non procede, i Drift che non sono più autorizzati o che hanno causato il rifiuto sono segnati come falliti dall'autopilota, ma sulla Board non compaiono come schede: stanno solo come righe dentro la scheda della Proposal, che non mostra alcun badge. Il motivo del fallimento resta quindi invisibile. A lavoro finito, ogni Drift fallito o escluso dall'autopilota porta il badge testuale `autopilot failed` con il motivo nel tooltip e nel nome accessibile `Autopilot failed: <motivo>` anche quando il suo Drift è elencato in una risoluzione aperta (accanto alla sua riga nella scheda della Proposal, senza creare nuove schede né copiare i due lati). Il badge sparisce quando il caso torna rivalutabile, non sposta il focus e non apre il pannello da solo. I Drift non falliti e i critici manuali non mostrano nulla.
