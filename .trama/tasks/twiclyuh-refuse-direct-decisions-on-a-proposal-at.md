---
column: done
technical: false
refs:
  - proposal
  - proposal/Open/developer.APPROVE_PROPOSAL
  - proposal/Open/developer.REJECT_PROPOSAL
  - requirements/rules#proposal
  - requirements/tech#proposal
  - requirements/ui#proposal
drift: null
proposal: 37d8rz9w
agent: false
created: 2026-10-07T17:03:22.381Z
finished: 2026-10-07T17:11:21.349Z
---
# Refuse direct decisions on a Proposal attached to an open Drift

Una Proposal è allegata a un Drift aperto quando un Drift aperto la nomina; un Drift risolto non la trattiene più. Finché è allegata, il developer la decide solo attraverso quel Drift.

A lavoro finito:
- approvarla o rifiutarla direttamente, dal pannello e con `trama proposal approve` / `trama proposal reject`, è rifiutato con un'uscita di errore, senza cambiare nulla (la Proposal resta Open, nessun feedback aggiunto), con il messaggio `Proposal <id> is attached to Drift <id>: decide on the Drift with trama drift resolve`;
- accettarla attraverso il Drift continua a funzionare e segue le regole di un'approvazione (bloccata se stale, in attesa, non valida, ancora Draft);
- il rimpiazzo di una Proposal obsoleta di un Drift continua a rifiutare la vecchia;
- una Proposal rimasta aperta di un Drift già risolto si approva e si rifiuta come le altre;
- la decisione «allegata a un Drift aperto» è una sola, nel nucleo condiviso, usata dalla riga di comando e dal pannello (Board, Diagramma, scheda Requirements).
