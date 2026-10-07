---
column: done
technical: false
refs:
  - announcement/Preparing/agent.START_PROPOSAL
  - announcement/Writing
  - announcement/Announced/agent.SUBMIT_PROPOSAL
  - announcement
  - requirements/data#announcement
  - requirements/rules#announcement
  - requirements/tech#announcement
drift: null
proposal: 37d8rz9w
agent: false
created: 2026-10-07T17:03:44.679Z
finished: 2026-10-07T17:10:59.306Z
---
# Bind a Drift's Draft to the Drift announcement

Un Drift che porterà una Proposal ha un solo annuncio, quello del Drift. Oggi una Draft cominciata nominando l'annuncio di un Drift non si lega a nulla: l'uscita dice che l'annuncio è di un altro tipo e la Draft resta senza ghost.

Fatto quando:
- cominciare una Proposal nominando l'annuncio di un Drift ancora Preparing lega la Draft a quell'annuncio (campo `proposal`): l'annuncio resta di tipo Drift, tiene il titolo del Drift, passa a Writing, e per quella Draft non nasce nessun annuncio di Proposal;
- la consegna di quella Draft non consegna l'annuncio del Drift: resta il ghost del Drift; la consegna di una Draft legata a un annuncio di Proposal continua a consegnarlo;
- archiviare il Drift con l'ID del suo annuncio lo consegna anche quando ha una Draft legata, e l'uscita non dice che l'annuncio non è stato usato;
- la sincronizzazione del titolo da parte dell'estensione non tocca mai un annuncio di Drift legato a una Draft;
- il ritiro di una Draft scartata dal developer ritira anche l'annuncio di Drift a cui è legata, senza avviso, come per gli altri;
- la Snapshot dice al pannello che l'annuncio di Drift ha la Draft (fase Writing), così il ghost può mostrare che la Proposal è in scrittura.
