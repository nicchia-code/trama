---
status: resolved
resolution: fix-code
refs:
  - requirements/tech#announcement
proposal: null
task: nu8n2t7y
origin: 4ao8shg5
option: 1
note: null
created: 2026-10-06T19:49:08.253Z
---
# La sincronizzazione Writing richiede una deroga tecnica approvata

## What happens

La modifica diretta del titolo di una Draft può lasciare diverso il titolo dell’annuncio Writing persistito da quello mostrato dal ghost. Il Task sceglie di autorizzare l’estensione ad aggiornare il titolo persistito, ma questa autorizzazione **non è presente nel requisito tecnico vigente**. Implementare adesso la sincronizzazione comporterebbe una scrittura non consentita; modificare il requisito durante l’implementazione è vietato.

## What should happen

Il titolo persistito e il titolo mostrato devono coincidere anche dopo una modifica diretta della Draft. Il requisito tecnico assegna però la scrittura degli annunci alla **riga di comando** e concede all’estensione soltanto la cancellazione. La soluzione scelta richiede quindi una modifica approvata dei Requisiti prima di essere implementata. L’implementazione del Task non può attribuire autonomamente questa nuova responsabilità all’estensione né modificare i Requisiti.

## Fix options

### Approvare la deroga limitata al titolo Writing

Aggiornare tramite un design approvato il requisito tecnico per consentire all’estensione di sincronizzare soltanto il titolo degli annunci Writing quando cambia il titolo della Draft. Associazione iniziale, identità, appartenenza e consegna restano invariate. Dopo l’approvazione si può riprendere il Task e verificare la coincidenza dei titoli anche dopo modifiche dirette. Richiede la revisione del requisito prima dell’implementazione.

### Mantenere la scrittura nella riga di comando

Conservare il requisito tecnico attuale e scegliere tramite un design approvato una riconciliazione eseguita dalla riga di comando, attivata anche quando la Draft viene modificata direttamente. L’estensione non scrive gli annunci. Prima dell’implementazione il design deve precisare quando avviene la riconciliazione e quale ritardo è ammesso nella coincidenza dei titoli. Questa alternativa cambia la soluzione scelta dal Task e richiede un diverso flusso di aggiornamento.

## Where in the code

src/core/announcements.ts: bindDraft; src/core/snapshot.ts: announcementView; extension/src/host/announcements.ts: watchAnnouncements
