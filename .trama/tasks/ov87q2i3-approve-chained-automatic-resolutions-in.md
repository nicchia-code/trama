---
column: done
technical: false
refs:
  - drift-resolution/Resolving/proposal.SUBMITTED
  - drift-resolution/Resolving/proposal.APPROVED
  - requirements/rules#drift-resolution
  - requirements/tech#drift-resolution
drift: null
proposal: null
agent: false
created: 2026-10-11T08:55:01.024Z
finished: 2026-10-11T08:58:28.535Z
---
# Approve chained automatic resolutions in dependency order

Quando la raccolta automatica ha bisogno di più Proposal di risoluzione in catena (per la dimensione), ognuna deve poter essere approvata dall'host, nell'ordine di dipendenza, anche se le altre Proposal della stessa raccolta sono ancora Draft o aperte. Oggi l'host rifiuta l'approvazione automatica di una risoluzione finché esiste un'altra risoluzione Draft o aperta, anche se è una Proposal della stessa raccolta: la catena funziona solo se l'agente consegna ogni Proposal prima di aprire la successiva e l'host approva in tempo. Deve essere vero a fine lavoro: le Proposal della raccolta corrente si approvano una dopo l'altra in ordine di dipendenza, il rifiuto resta per Proposal estranee alla raccolta o manuali, i Task di correzione e le origini sono raccolti da tutte le sole Proposal approvate della raccolta, e la skill trama-resolve-drifts dice all'agente come dividere in catena e consegnare in ordine.
