---
refs:
  - raffinamento
  - requirements/rules#raffinamento
  - requirements/tech#raffinamento
---

# Raffinamento senza ghost

In nessun momento di un raffinamento la Proposal raffinata compare come ghost: né sulla Board, né nella barra di stato, né nei dettagli di un ghost. Questo vale mentre la Proposal è Open prima del rebase, mentre è una Draft con `refining: true`, durante un giro di domande e dopo Remove. La sua card è già sulla Board, quindi l'annuncio del raffinamento, legato alla Proposal al lancio, resta legato senza produrre un ghost.

Remove rifiuta la Proposal e, nello stesso passo, ritira subito l'annuncio del raffinamento, senza alcuna notifica. Questo comportamento si appoggia al ritiro dell'annuncio legato che fa il rifiuto di una Proposal (`rejectProposal` chiama `removeBoundTo` sotto il lock `announcements`, coperto dal Task sul rifiuto in `announcement`): questo Task non duplica quel cambiamento, ma verifica che il raffinamento ne dipenda e che quindi, fra il rifiuto e la fine del job, lo Snapshot non veda mai l'annuncio slegato da una card. Di conseguenza, alla fine del job di un raffinamento concluso con Remove non resta alcun annuncio da ritirare e non viene preparata alcuna notifica `The agent finished without delivering …`.

Restano invariati gli altri esiti: la consegna (che già ritira l'annuncio con `removeBoundTo`), la consegna rifiutata, lo scarto, e Keep o l'arresto dell'agente, in cui la Proposal resta con la sua card fino alla fine del job. Nessun nuovo controllo della CLI viene aggiunto sugli annunci o sulle Proposal create dall'agente che raffina: basta la skill.

Fatto quando un test con `bun:test` rifiuta una Proposal Open con un annuncio vivo legato, come fa Remove in un raffinamento, e verifica che l'annuncio non esiste più e che lo Snapshot non ha alcun ghost per esso.
