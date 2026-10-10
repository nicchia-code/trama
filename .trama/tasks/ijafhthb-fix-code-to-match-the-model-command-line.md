---
column: done
technical: false
refs:
  - scan-hold/On/proposal.APPROVED
  - requirements/rules#scan-hold
drift: ndeudi4n
proposal: null
agent: false
created: 2026-10-09T19:04:22.991Z
finished: 2026-10-09T19:10:04.322Z
---
# Fix code to match the Model: Command-line approvals with Hold scan on are neither held nor scanned

## What happens

Con Hold scan acceso, una Proposal ordinaria approvata con `trama proposal approve` o con `trama drift resolve --accept-proposal`, mentre l'editor è aperto sul progetto, **non entra nel sospeso** e non fa partire nessuna scansione. Il contatore non cresce e, quando il developer spegne l'interruttore, ciò che quella Proposal ha cambiato non viene scansionato: **la scansione si perde** senza avviso.

Il codice segue il Requisito `rules#scan-hold`, che fa entrare nel sospeso solo le approvazioni dal pannello.

## What should happen

Nel Diagram, la Transition `proposal.APPROVED` di *On* non distingue da dove arriva l'approvazione: per ogni modifica ordinaria, con la scansione automatica accesa e almeno una Feature toccata, la Proposal **entra nel sospeso** e il contatore cresce di uno. Anche l'Event `proposal.APPROVED` e la Transition di agent-terminal dicono che con Hold scan acceso la Proposal resta in sospeso.

Modello e Requisito si contraddicono: il developer deve scegliere quale dei due vale.

## Chosen option

**Mettere nel sospeso anche le approvazioni da riga di comando**

L'editor, quando riceve l'avviso di un'approvazione fatta fuori dal pannello con Hold scan acceso, mette la Proposal nel sospeso alle stesse condizioni del pannello, come dice il Diagram. Nessuna scansione si perde. Serve anche una Proposal che tolga da `rules#scan-hold` la regola per cui la riga di comando non tocca il sospeso. A editor chiuso non entra nulla.

## Where in the code

extension/src/host/controller.ts, `scanApproved` (approvazioni fatte fuori dal pannello, segnalate da `takeApprovedNotices` in extension/src/host/main.ts); extension/src/host/approval.ts, `applyApprovedProposal`
