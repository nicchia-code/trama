---
column: done
technical: true
refs:
  - requirements/tech#announcement
drift: ja8hgo6n
proposal: null
agent: false
created: 2026-10-06T19:51:09.603Z
finished: 2026-10-06T20:44:10.472Z
---
# Fix code to match the Requirements: La sincronizzazione Writing richiede una deroga tecnica approvata

## What happens

La modifica diretta del titolo di una Draft può lasciare diverso il titolo dell’annuncio Writing persistito da quello mostrato dal ghost. Il Task sceglie di autorizzare l’estensione ad aggiornare il titolo persistito, ma questa autorizzazione **non è presente nel requisito tecnico vigente**. Implementare adesso la sincronizzazione comporterebbe una scrittura non consentita; modificare il requisito durante l’implementazione è vietato.

## What should happen

Il titolo persistito e il titolo mostrato devono coincidere anche dopo una modifica diretta della Draft. Il requisito tecnico assegna però la scrittura degli annunci alla **riga di comando** e concede all’estensione soltanto la cancellazione. La soluzione scelta richiede quindi una modifica approvata dei Requisiti prima di essere implementata. L’implementazione del Task non può attribuire autonomamente questa nuova responsabilità all’estensione né modificare i Requisiti.

## Chosen option

**Approvare la deroga limitata al titolo Writing**

Aggiornare tramite un design approvato il requisito tecnico per consentire all’estensione di sincronizzare soltanto il titolo degli annunci Writing quando cambia il titolo della Draft. Associazione iniziale, identità, appartenenza e consegna restano invariate. Dopo l’approvazione si può riprendere il Task e verificare la coincidenza dei titoli anche dopo modifiche dirette. Richiede la revisione del requisito prima dell’implementazione.

## Where in the code

src/core/announcements.ts: bindDraft; src/core/snapshot.ts: announcementView; extension/src/host/announcements.ts: watchAnnouncements
