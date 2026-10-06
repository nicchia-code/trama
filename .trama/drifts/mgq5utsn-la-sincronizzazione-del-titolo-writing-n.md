---
status: resolved
resolution: fix-code
refs:
  - requirements/tech#announcement
proposal: null
task: q8o95qpd
origin: nu8n2t7y
option: 1
note: null
created: 2026-10-06T19:52:33.074Z
---
# La sincronizzazione del titolo Writing non è autorizzata dai Requisiti

## What happens

Dopo una modifica diretta del titolo di una Draft, il ghost Writing mostra il titolo aggiornato della Draft, mentre l’annuncio persistito può conservare il titolo precedente. La soluzione scelta dal Task nu8n2t7y richiede che l’estensione aggiorni quel titolo persistito. Il requisito vigente non autorizza questa scrittura; non è quindi possibile implementare la soluzione scelta senza attribuire all’estensione una responsabilità vietata.

## What should happen

Il titolo persistito e quello mostrato devono coincidere anche quando la Draft viene modificata direttamente. Tuttavia il requisito tecnico vigente assegna alla riga di comando la scrittura degli annunci e consente all’estensione soltanto di cancellarli. La deroga necessaria non compare nel testo vigente fornito dal Task. Occorre una decisione del developer e una modifica approvata dei Requisiti prima di consentire all’estensione di sincronizzare il titolo Writing; l’implementazione non può modificare autonomamente questo vincolo.

## Fix options

### Approvare una deroga limitata al titolo Writing

Consentire mediante un design approvato che l’estensione aggiorni soltanto il titolo degli annunci Writing associati a una Draft quando cambia il titolo della Draft. Identità, appartenenza, associazione iniziale e consegna restano invariati. Questa opzione conserva la soluzione scelta dal Task e rende possibile gestire le modifiche dirette, ma richiede la revisione e l’approvazione del requisito tecnico prima di riprendere l’implementazione.

### Affidare alla riga di comando anche le modifiche del titolo

Mantenere la scrittura degli annunci esclusivamente nella riga di comando e introdurre, tramite un design approvato, un flusso di rinomina della Draft che sincronizzi contestualmente il titolo persistito. Per garantire la coincidenza anche rispetto alle modifiche dirette, il design deve stabilire come queste vengano recepite o impedite. Evita la deroga per l’estensione, ma cambia il flusso di modifica e richiede una nuova decisione sui Requisiti.

## Where in the code

src/core/announcements.ts: bindDraft; src/core/snapshot.ts: announcementView; extension/src/host/announcements.ts: watchAnnouncements
