---
column: done
technical: false
refs:
  - requirements/rules#scan-hold
  - proposal.APPROVED
drift: lq5q1d41
proposal: null
agent: false
created: 2026-10-07T06:02:00.611Z
finished: 2026-10-07T06:12:34.689Z
---
# Fix code to match the Model: Le approvazioni da riga di comando avviano la scansione automatica, contro il Requisito di Hold scan

## What happens

Con Hold scan spento, una Proposal ordinaria approvata con `trama proposal approve` o con `trama drift resolve --accept-proposal`, mentre l'editor è aperto sul progetto, **fa partire la scansione automatica** come un'approvazione dal pannello. Con Hold scan acceso non parte nulla e la Proposal non entra nel sospeso.

È il comportamento scelto risolvendo il Drift nbtk5zny (fix-code, opzione 1), ed è quello del Diagram di agent-terminal, dove nessuna Transition su `proposal.APPROVED` esclude la riga di comando.

## What should happen

Il Requisito `rules#scan-hold` dice che queste approvazioni dalla riga di comando "non toccano il sospeso, **come non avviano la scansione automatica**". La prima parte è rispettata; la seconda afferma che dalla riga di comando la scansione automatica non parte mai, cosa che il codice e il Diagram di agent-terminal contraddicono.

## Chosen option

**Correggere il Requisito**

Il developer apre una Proposal che toglie da `rules#scan-hold` l'inciso "come non avviano la scansione automatica", lasciando solo che le approvazioni da riga di comando non toccano il sospeso. Il codice resta com'è e Requisito e Diagram tornano coerenti. Costa una piccola Proposal da approvare.

## Where in the code

extension/src/host/main.ts (sondaggio delle approvazioni fatte fuori dal pannello, `takeApprovedNotices`); extension/src/host/controller.ts, `scanApproved`
