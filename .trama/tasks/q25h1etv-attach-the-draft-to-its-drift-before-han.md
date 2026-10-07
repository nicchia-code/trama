---
column: done
technical: false
refs:
  - drift
  - drift/Open/agent.REPLACE_DRIFT_PROPOSAL
  - requirements/tech#drift
drift: null
proposal: 37d8rz9w
agent: false
created: 2026-10-07T17:03:57.890Z
finished: 2026-10-07T17:15:19.157Z
---
# Attach the Draft to its Drift before handing it over in the agent skills

Oggi le skill che archiviano un Drift con una Proposal (scan e implement) consegnano prima la Proposal e solo dopo archiviano il Drift, annunciando due schede separate; così la Proposal compare per un momento da sola, come scheda da decidere. Allo stesso modo, il rifacimento di una Proposal obsoleta (skill di design e richiesta «Rework Proposal» del pannello) consegna la nuova Proposal e solo dopo la sostituisce nel Drift.

Quando è fatto:
- Le skill scan e implement annunciano solo il Drift, cominciano la Proposal legandola all'annuncio del Drift, la scrivono, la validano e la rileggono, poi archiviano il Drift una sola volta con la Draft allegata e con l'annuncio, e subito dopo consegnano la Proposal. Se la consegna è rifiutata la correggono e riprovano; non archiviano mai un secondo Drift.
- La skill di design, quando rifà la Proposal obsoleta di un Drift, sostituisce la Proposal nel Drift subito dopo aver creato la Draft, e la consegna solo alla fine, dopo validazione e rilettura; la richiesta di rifacimento inviata dal pannello all'agente descrive lo stesso ordine.
- Una Proposal destinata a un Drift non è mai visibile da sola: dall'inizio appartiene al Drift.
