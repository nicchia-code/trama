---
technical: false
refs:
  - proposal/Open
  - proposal/Draft/agent.SUBMIT_PROPOSAL
  - proposal/Draft/drift-resolution.PREPARED_RESOLUTION_WRITTEN
  - requirements/rules#proposal
---
# Approve e Refine All durante un Run

Dal pannello nessuna Proposal si approva mentre un Run lanciato da questa finestra è in corso (una sequenza di Run per modello conta come un solo Run; un Run di un'altra finestra non conta; la riga di comando non conosce i Run e non aspetta). `Approve`, sulla Board e nei dettagli del Diagramma, resta disattivato con il motivo `A run is in progress`, anche quando avvierebbe o riprenderebbe un raffinamento, e si riabilita da solo alla fine del Run; l'host rifiuta con lo stesso motivo un messaggio di approvazione che arriva comunque, senza cambiare nulla. Questo comportamento c'è già e non deve cambiare: il controllo `refuseWhileRunning` dell'host continua ad applicarsi all'Approve singolo.

L'eccezione è Refine All: resta disponibile durante un Run e fa partire i raffinamenti. Il controllo `refuseWhileRunning` non deve applicarsi all'azione `refineAll`. Le Proposal raffinate durante il Run però non si approvano subito: aspettano la fine del Run con il badge `waiting for the run`, esattamente come oggi accade alle Proposal raffinate dopo Approve, e si approvano alla fine del Run. Così un Run lavora su un Modello che non cambia finché non finisce.

Quando un raffinamento chiesto con Approve **oppure** con Refine All finisce con la Proposal consegnata e non bloccata (`raffinamento.PROPOSAL_RAFFINATA`), la Proposal è approvata come se il developer l'avesse approvata in quel momento, con le stesse condizioni e conseguenze, Task compresi. Se l'approvazione è rifiutata, la Proposal resta Open e la Board dice perché. Il percorso di approvazione dopo il raffinamento (oggi `settleRefined` → `approveProposal`) deve quindi valere identico per le Proposal raffinate da Refine All.

Le due transizioni `proposal/Draft/agent.SUBMIT_PROPOSAL` e `proposal/Draft/drift-resolution.PREPARED_RESOLUTION_WRITTEN` portano soltanto in Open e non richiedono nessun cambiamento.
