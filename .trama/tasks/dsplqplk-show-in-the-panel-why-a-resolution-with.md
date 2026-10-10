---
column: done
technical: true
refs:
  - requirements/rules#proposal
drift: null
proposal: null
agent: false
created: 2026-10-10T10:20:29.776Z
finished: 2026-10-10T10:39:04.401Z
---
# Show in the panel why a resolution with unfixable Drifts cannot be approved

Quando una risoluzione aperta è bloccata perché un Drift ancora aperto con decisione di correggere il codice non si potrebbe più correggere nel Modello con la risoluzione applicata, il pannello (scheda della Board e dettagli nel Diagramma) mostra lo stesso motivo della validazione, di `trama proposal show` e del rifiuto dell'approvazione: nomina ogni Drift interessato e dice di far riscrivere la risoluzione a Resolve Drifts. Oggi il motivo del pulsante Approve disabilitato e il badge parlano invece di un Modello che diventerebbe non valido, anche quando il Modello resta valido. Fatto quando, per una risoluzione con soli Drift non correggibili e un Modello valido, il pannello non parla più di Modello non valido e mostra il motivo giusto, mentre una Proposal davvero non valida continua a mostrare il suo.
