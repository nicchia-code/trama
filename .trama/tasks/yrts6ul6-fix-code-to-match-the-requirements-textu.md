---
column: done
technical: true
refs:
  - requirements/data#task
drift: ukbuulzb
proposal: null
agent: false
created: 2026-10-14T16:59:18.863Z
finished: 2026-10-14T17:09:00.629Z
---
# Fix code to match the Requirements: Textual Board lists the open Drifts of a resolution as separate cards

## What happens

Nel testo di `trama board`, la sezione To decide elenca ogni Drift aperto come riga a sé, anche quando è raccolto in una Proposal di risoluzione aperta. La riga della risoluzione dice quanti Drift risolve, e gli stessi Drift compaiono anche da soli.

## What should happen

Una risoluzione aperta e i Drift aperti che elenca formano una sola voce di To decide: i Drift stanno dentro la riga della risoluzione e non come voci a sé. Tornano voci proprie solo quando la risoluzione non è più aperta, cioè in scrittura, rifiutata o scartata. La Board nell'editor già fa così.

## Chosen option

**Nest the Drifts under their open resolution**

Sotto la riga della risoluzione aperta si elencano i suoi Drift aperti, ciascuno con la decisione presa, come già fanno le Proposal allegate. Non compaiono più come voci a sé. Il conteggio e l'ordine della sezione restano quelli di oggi. Costo: la sezione è un po' più annidata, e per vedere un Drift serve leggere la risoluzione.

## Where in the code

src/cli/work.ts: boardView, il filtro dei Drift aperti nella sezione To decide e l'elenco annidato sotto le Proposal.
