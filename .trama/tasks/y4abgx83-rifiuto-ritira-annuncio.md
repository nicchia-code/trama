---
column: done
technical: false
refs:
  - announcement/Announced/developer.REJECT_PROPOSAL
  - requirements/rules#announcement
  - requirements/ui#announcement
drift: null
proposal: yrmzsu3i
agent: false
created: 2026-10-25T11:11:09.783Z
finished: 2026-10-25T12:22:28.528Z
---
# Il rifiuto ritira l'annuncio

Quando una Proposal viene rifiutata, l'annuncio legato a quella Proposal passa subito a Withdrawn: non resta alcun ghost né sulla Board né nella barra di stato, e a fine job non compare alcun avviso di annuncio ritirato. Vale per ogni rifiuto, sia quello dello sviluppatore sia quello che l'agente compie su scelta dello sviluppatore (Remove durante un raffinamento). Solo l'annuncio legato alla Proposal rifiutata viene ritirato; gli altri annunci restano come sono.

Oggi `rejectProposal` in `src/core/proposals.ts` non tocca gli annunci: la Proposal rifiutata perde la card, e il suo annuncio ancora vivo ricompare come ghost nel Backlog finché il job non finisce, quando viene ritirato con avviso. Al termine, `rejectProposal` chiama `removeBoundTo` per la Proposal rifiutata, come già fanno la consegna (`submitProposal`) e `giveUp`, sotto il lock `announcements`, così l'annuncio sparisce nello stesso passo del rifiuto e il ritiro di fine job non trova più nulla da segnalare.

Un test con `bun:test` rifiuta una Proposal Open che ha un annuncio vivo legato e verifica che l'annuncio non esiste più e che lo Snapshot non contiene alcun ghost per esso.
