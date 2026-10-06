---
column: done
technical: true
refs:
  - requirements/tech#announcement
drift: mgq5utsn
proposal: null
agent: false
created: 2026-10-06T20:02:04.580Z
finished: 2026-10-06T20:32:41.399Z
---
# Fix code to match the Requirements: La sincronizzazione del titolo Writing non è autorizzata dai Requisiti

## What happens

Dopo una modifica diretta del titolo di una Draft, il ghost Writing mostra il titolo aggiornato della Draft, mentre l’annuncio persistito può conservare il titolo precedente. La soluzione scelta dal Task nu8n2t7y richiede che l’estensione aggiorni quel titolo persistito. Il requisito vigente non autorizza questa scrittura; non è quindi possibile implementare la soluzione scelta senza attribuire all’estensione una responsabilità vietata.

## What should happen

Il titolo persistito e quello mostrato devono coincidere anche quando la Draft viene modificata direttamente. Tuttavia il requisito tecnico vigente assegna alla riga di comando la scrittura degli annunci e consente all’estensione soltanto di cancellarli. La deroga necessaria non compare nel testo vigente fornito dal Task. Occorre una decisione del developer e una modifica approvata dei Requisiti prima di consentire all’estensione di sincronizzare il titolo Writing; l’implementazione non può modificare autonomamente questo vincolo.

## Chosen option

**Approvare una deroga limitata al titolo Writing**

Consentire mediante un design approvato che l’estensione aggiorni soltanto il titolo degli annunci Writing associati a una Draft quando cambia il titolo della Draft. Identità, appartenenza, associazione iniziale e consegna restano invariati. Questa opzione conserva la soluzione scelta dal Task e rende possibile gestire le modifiche dirette, ma richiede la revisione e l’approvazione del requisito tecnico prima di riprendere l’implementazione.

## Where in the code

src/core/announcements.ts: bindDraft; src/core/snapshot.ts: announcementView; extension/src/host/announcements.ts: watchAnnouncements
