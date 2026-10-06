---
column: done
technical: false
refs:
  - requirements/data#announcement
  - announcement/Preparing/agent.START_PROPOSAL
drift: xiv4dfqn
proposal: null
agent: false
created: 2026-10-06T18:59:11.162Z
finished: 2026-10-06T20:44:54.395Z
---
# Fix code to match the Model: Il titolo persistito dell'annuncio non segue il ghost Writing

## What happens

Quando una Draft prende un annuncio Preparing, il ghost passa correttamente a Writing e mostra il titolo della Draft, ma il titolo H1 dell'annuncio persistito resta quello originariamente annunciato. Per esempio, una richiesta «Original request» diventa il ghost «Actual draft title» mentre il suo annuncio su disco continua a chiamarsi «Original request».

## What should happen

Il requisito dei dati stabilisce che il titolo H1 dell'annuncio sia **il titolo mostrato sul ghost**. Quando la Draft prende l'annuncio e ne sostituisce il titolo visibile, anche il titolo persistito deve descrivere la stessa consegna.

## Chosen option

**Allineare il titolo dell'annuncio alla Draft quando viene associata**

Al passaggio da Preparing a Writing, conservare l'identità e l'appartenenza dell'annuncio ma sostituirne il titolo con quello della Draft. Mantenere questo allineamento se il titolo della Draft cambia mentre l'annuncio esiste. Il ghost resta come oggi; si corregge soltanto la rappresentazione persistita richiesta. Costo limitato agli aggiornamenti del titolo durante la vita della Draft annunciata.

## Where in the code

src/core/announcements.ts: bindDraft, write; src/core/snapshot.ts: announcementView, buildSnapshot
