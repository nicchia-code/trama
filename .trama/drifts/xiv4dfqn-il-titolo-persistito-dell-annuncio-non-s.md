---
status: resolved
resolution: fix-code
refs:
  - requirements/data#announcement
  - announcement/Preparing/agent.START_PROPOSAL
proposal: null
task: ob5wod5o
origin: null
option: 1
note: null
created: 2026-10-06T18:58:54.340Z
---
# Il titolo persistito dell'annuncio non segue il ghost Writing

## What happens

Quando una Draft prende un annuncio Preparing, il ghost passa correttamente a Writing e mostra il titolo della Draft, ma il titolo H1 dell'annuncio persistito resta quello originariamente annunciato. Per esempio, una richiesta «Original request» diventa il ghost «Actual draft title» mentre il suo annuncio su disco continua a chiamarsi «Original request».

## What should happen

Il requisito dei dati stabilisce che il titolo H1 dell'annuncio sia **il titolo mostrato sul ghost**. Quando la Draft prende l'annuncio e ne sostituisce il titolo visibile, anche il titolo persistito deve descrivere la stessa consegna.

## Fix options

### Allineare il titolo dell'annuncio alla Draft quando viene associata

Al passaggio da Preparing a Writing, conservare l'identità e l'appartenenza dell'annuncio ma sostituirne il titolo con quello della Draft. Mantenere questo allineamento se il titolo della Draft cambia mentre l'annuncio esiste. Il ghost resta come oggi; si corregge soltanto la rappresentazione persistita richiesta. Costo limitato agli aggiornamenti del titolo durante la vita della Draft annunciata.

### Rigenerare la rappresentazione persistita del ghost Writing

Una volta associata la Draft, derivare da essa il titolo da persistere ogni volta che il relativo annuncio viene aggiornato, invece di conservare il testo della richiesta iniziale. Il dato su disco e il ghost descrivono così sempre la medesima consegna. Costo maggiore: tutti gli aggiornamenti di un annuncio Writing devono poter leggere la Draft associata, anche quelli che rinnovano soltanto la quiete.

## Where in the code

src/core/announcements.ts: bindDraft, write; src/core/snapshot.ts: announcementView, buildSnapshot
