---
status: resolved
resolution: fix-code
refs:
  - requirements/rules#scan-hold
  - proposal.APPROVED
proposal: null
task: a230cjmc
origin: null
option: 1
note: null
created: 2026-10-07T06:01:43.466Z
---
# Le approvazioni da riga di comando avviano la scansione automatica, contro il Requisito di Hold scan

## What happens

Con Hold scan spento, una Proposal ordinaria approvata con `trama proposal approve` o con `trama drift resolve --accept-proposal`, mentre l'editor è aperto sul progetto, **fa partire la scansione automatica** come un'approvazione dal pannello. Con Hold scan acceso non parte nulla e la Proposal non entra nel sospeso.

È il comportamento scelto risolvendo il Drift nbtk5zny (fix-code, opzione 1), ed è quello del Diagram di agent-terminal, dove nessuna Transition su `proposal.APPROVED` esclude la riga di comando.

## What should happen

Il Requisito `rules#scan-hold` dice che queste approvazioni dalla riga di comando "non toccano il sospeso, **come non avviano la scansione automatica**". La prima parte è rispettata; la seconda afferma che dalla riga di comando la scansione automatica non parte mai, cosa che il codice e il Diagram di agent-terminal contraddicono.

## Fix options

### Correggere il Requisito

Il developer apre una Proposal che toglie da `rules#scan-hold` l'inciso "come non avviano la scansione automatica", lasciando solo che le approvazioni da riga di comando non toccano il sospeso. Il codice resta com'è e Requisito e Diagram tornano coerenti. Costa una piccola Proposal da approvare.

### Non avviare la scansione dalla riga di comando

Il codice smette di avviare la scansione automatica quando l'approvazione arriva da `trama proposal approve` o `trama drift resolve --accept-proposal`, come dice il Requisito. Contraddice il Diagram di agent-terminal e annulla la decisione del Drift nbtk5zny; servirebbe anche una Proposal sul Diagram, e la scansione dopo un'approvazione da terminale si perde.

## Where in the code

extension/src/host/main.ts (sondaggio delle approvazioni fatte fuori dal pannello, `takeApprovedNotices`); extension/src/host/controller.ts, `scanApproved`
