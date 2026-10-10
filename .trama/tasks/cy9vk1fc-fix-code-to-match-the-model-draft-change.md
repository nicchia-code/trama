---
column: done
technical: false
refs:
  - announcement/Announced/time.QUIET_PERIOD_ELAPSED
  - requirements/rules#announcement
drift: qphm54a5
proposal: null
agent: false
created: 2026-10-09T21:50:06.480Z
finished: 2026-10-09T21:56:00.665Z
---
# Fix code to match the Model: Draft changes refresh the quiet period of every announcement

## What happens

Ogni modifica a una Draft che ha un annuncio fa ripartire i quindici minuti di ogni annuncio ancora in attesa, non solo quelli dell'annuncio di quella Draft. Il timer prende inoltre l'ultima modifica di una Draft legata come momento di ripartenza per tutti, così la Draft di un annuncio tiene vivi gli altri.

## What should happen

Una modifica a una Draft tiene vivo solo l'annuncio legato a quella Draft; gli altri annunci dell'agente aspettano i propri quindici minuti.

## Chosen option

**Contare le modifiche della Draft sul proprio annuncio**

Ogni annuncio registra la modifica della propria Draft, e il timer usa quel momento solo per lui. Gli altri annunci non cambiano la loro quiete. Costi: la modifica va registrata per annuncio, quindi quando gira il timer bisogna leggere l'ora di ciascuna Draft.

## Where in the code

src/core/announcements.ts (markDraftActivity, quietAnnouncements); src/core/proposals.ts (boundDraftsChangedAt); extension/src/host/announcements.ts (watchAnnouncements)
