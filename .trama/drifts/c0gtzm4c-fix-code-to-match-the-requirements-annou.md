---
status: resolved
resolution: fix-code
refs:
  - requirements/data#announcement
  - announcement
proposal: null
task: vshn3s8o
origin: null
option: 1
note: null
created: 2026-10-07T17:49:55.804Z
---
# Fix code to match the Requirements: Announcement files carry and require a created field the data Requirement does not list

## What happens

Ogni file di annuncio ha nel front matter, oltre ai campi previsti, anche **`created`**, l'istante in cui è stato annunciato. Trama lo usa per tenere i ghost nell'ordine di annuncio e per scegliere l'annuncio di richiesta più vecchio ancora Preparing.

Un file di annuncio senza `created`, scritto esattamente come dice il Requisito, è considerato illeggibile: non diventa un ghost, non si consegna e non si ritira.

## What should happen

Il front matter di un annuncio ha solo i campi elencati da `data#announcement`: `kind`, `source`, `proposal`, `terminal`, `touched` e, quando valgono, `chat`, `phase` e `drift`. **Nessun campo `created`.**

Intanto `ui#panel` chiede che più ghost restino nell'ordine in cui sono stati annunciati, e il Requisito delle regole che la Draft prenda l'annuncio di richiesta più vecchio: quell'ordine va ricavato senza un campo in più.

## Fix options

### Ordinare per nascita del file

Non scrivere più `created` e leggere anche i file che non lo hanno. L'ordine di annuncio si ricava dall'istante di nascita del file, a parità dall'identità. Costo: su filesystem che non conservano la nascita del file l'ordine ripiega sull'ultima modifica, che cambia a ogni attività dell'agente, e i ghost possono scambiarsi di posto.

### Ordinare per touched e identità

Non scrivere più `created`, leggere anche i file che non lo hanno e ordinare gli annunci per `touched` e poi per identità. Costo: ogni attività dell'agente aggiorna `touched` di tutti gli annunci allo stesso istante, quindi di fatto l'ordine diventa quello casuale delle identità e i ghost non tengono più l'ordine di annuncio chiesto dal pannello.

## Where in the code

src/core/announcements.ts: `announce` scrive `created`, `parse` lo esige, `listAnnouncements` ordina per esso; `bindDraft` sceglie la richiesta più vecchia in quell'ordine.
