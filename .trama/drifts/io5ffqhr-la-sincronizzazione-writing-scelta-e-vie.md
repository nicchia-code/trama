---
status: resolved
resolution: fix-code
refs:
  - requirements/tech#announcement
proposal: null
task: 4ao8shg5
origin: hbmlnnb8
option: 1
note: null
created: 2026-10-06T19:45:09.844Z
---
# La sincronizzazione Writing scelta è vietata dal requisito tecnico vigente

## What happens

Il Task richiede che l’estensione sincronizzi il titolo persistito degli annunci Writing dopo una modifica diretta della Draft. La scelta risolverebbe la divergenza osservata: il ghost mostra il nuovo titolo mentre l’annuncio conserva il precedente. Tuttavia il requisito tecnico incluso nel Task assegna ancora la scrittura degli annunci alla riga di comando e concede all’estensione soltanto la cancellazione. Implementare la scelta comporterebbe una **deroga non recepita nei Requisiti**.

## What should happen

Il titolo persistito e il titolo mostrato devono coincidere anche dopo modifiche dirette della Draft, rispettando le responsabilità stabilite dai Requisiti. Per applicare la scelta già indicata nel Task serve autorizzare esplicitamente l’estensione ad aggiornare **soltanto il titolo degli annunci Writing**. Il requisito attuale non contiene questa autorizzazione; non può essere modificato durante l’implementazione e la scelta descritta nel Task non elimina il conflitto con il testo vigente.

## Fix options

### Recepire la deroga limitata nei Requisiti

Aggiornare il requisito tecnico per autorizzare l’estensione a sincronizzare soltanto il titolo degli annunci Writing quando cambia quello della Draft. Associazione iniziale, identità, appartenenza e consegna restano invariate. Questa è la soluzione già scelta dal Task; richiede una modifica approvata dei Requisiti prima dell’implementazione, senza ampliare le responsabilità dell’estensione agli altri dati.

### Mantenere la scrittura esclusiva nella CLI

Definire nei Requisiti un meccanismo con cui l’estensione richiede alla riga di comando la sincronizzazione dopo aver osservato una modifica diretta della Draft. L’estensione continua a non scrivere gli annunci, ma occorre precisare come il comando viene avviato e quando il titolo aggiornato viene pubblicato. La soluzione aggiunge coordinamento tra processi rispetto alla deroga limitata.

## Where in the code

src/core/announcements.ts: bindDraft; src/core/snapshot.ts: announcementView; extension/src/host/announcements.ts: watchAnnouncements
