---
status: resolved
resolution: fix-code
refs:
  - announcement
  - announcement/Preparing/agent.START_PROPOSAL
  - requirements/rules#announcement
  - requirements/tech#announcement
proposal: null
task: ymd7jf2i
origin: null
option: 1
note: null
resolvedBy: 5mztm9sl
created: 2026-10-10T12:48:57.255Z
---
# Una Draft prende l’annuncio di una richiesta destinata a un altro terminale

## What happens

Quando un agente comincia una Proposal senza nominare un annuncio, la Draft prende il più vecchio annuncio di richiesta ancora Preparing dell’intero progetto, **anche se appartiene a un altro terminale**. Il ghost cambia titolo e passa a Writing nel terminale della richiesta originaria. Alla consegna della Proposal quell’annuncio sparisce, oppure la fine del terminale originario può ritirarlo mentre l’agente dell’altro terminale sta ancora scrivendo.

## What should happen

Un annuncio appartiene al terminale in cui Trama ha inviato la richiesta o in cui lavora l’agente che lo ha creato: quanto accade in un altro terminale non lo modifica. La Draft deve prendere il più vecchio annuncio Preparing della richiesta pertinente al proprio terminale, oppure l’annuncio nominato che appartiene a quella consegna. Se non esiste una richiesta pertinente, nasce il proprio annuncio già Writing con la provenienza dell’agente; un annuncio in attesa in un altro terminale resta invariato.

## Fix options

### Associare automaticamente soltanto richieste dello stesso terminale

Nella presa in carico automatica considerare solo le richieste Preparing del terminale in cui comincia la Draft, mantenendo l’ordine dalla più vecchia. Se non ce ne sono, creare il ghost della nuova Proposal con la sua provenienza. È la correzione più circoscritta: conserva l’assenza dell’ID nel messaggio all’agente e impedisce che consegna o chiusura di un terminale interferiscano con il lavoro dell’altro.

### Associare la Draft attraverso la richiesta scritta

Quando la Draft nomina una richiesta scritta, identificare prima l’annuncio di quella richiesta e usarlo soltanto se appartiene al terminale dell’agente. Per le richieste non scritte mantenere la scelta della più vecchia nello stesso terminale. Richiede una correlazione più esplicita fra richiesta e annuncio, ma distingue anche più richieste pendenti nello stesso terminale senza trasferire ghost tra agenti diversi.

## Where in the code

src/core/announcements.ts: bindDraft; src/core/proposals.ts: newProposal; test/announcements.test.ts
