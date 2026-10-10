---
status: resolved
resolution: fix-code
refs:
  - announcement/Announced/time.QUIET_PERIOD_ELAPSED
  - requirements/rules#announcement
proposal: null
task: cy9vk1fc
origin: null
option: 1
note: null
resolvedBy: b4duwb4w
created: 2026-10-09T21:24:56.084Z
---
# Draft changes refresh the quiet period of every announcement

## What happens

Ogni modifica a una Draft che ha un annuncio fa ripartire i quindici minuti di ogni annuncio ancora in attesa, non solo quelli dell'annuncio di quella Draft. Il timer prende inoltre l'ultima modifica di una Draft legata come momento di ripartenza per tutti, così la Draft di un annuncio tiene vivi gli altri.

## What should happen

Una modifica a una Draft tiene vivo solo l'annuncio legato a quella Draft; gli altri annunci dell'agente aspettano i propri quindici minuti.

## Fix options

### Contare le modifiche della Draft sul proprio annuncio

Ogni annuncio registra la modifica della propria Draft, e il timer usa quel momento solo per lui. Gli altri annunci non cambiano la loro quiete. Costi: la modifica va registrata per annuncio, quindi quando gira il timer bisogna leggere l'ora di ciascuna Draft.

### Mantenere la ripartenza comune e documentarla

Il Requisito viene cambiato per dire che ogni modifica a una Draft fa ripartire tutti gli annunci. Il codice non cambia. Costi: un agente che modifica una Draft a lungo tiene sulla Board annunci non collegati, e i ghost restano più del previsto dal Requisito.

## Where in the code

src/core/announcements.ts (markDraftActivity, quietAnnouncements); src/core/proposals.ts (boundDraftsChangedAt); extension/src/host/announcements.ts (watchAnnouncements)
