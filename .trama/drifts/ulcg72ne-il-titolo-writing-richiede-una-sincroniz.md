---
status: resolved
resolution: fix-code
refs:
  - requirements/tech#announcement
proposal: null
task: hbmlnnb8
origin: ob5wod5o
option: 1
note: null
created: 2026-10-06T19:32:47.929Z
---
# Il titolo Writing richiede una sincronizzazione fuori dalla CLI

## What happens

Quando l'agente cambia direttamente il titolo di una Draft annunciata, il ghost Writing prende subito il nuovo titolo alla lettura della Board, senza eseguire un comando Trama. Il titolo persistito dell'annuncio resta precedente. È possibile correggere l'associazione iniziale nella CLI, ma questo non copre le successive modifiche dirette, consentite durante la scrittura della Draft.

## What should happen

Il titolo persistito deve coincidere con quello mostrato sul ghost per tutta la vita dell'annuncio. Il requisito tecnico assegna però la scrittura degli annunci alla **riga di comando**, mentre l'estensione può cancellarli e il Snapshot li legge. Dopo una modifica diretta della Draft non viene eseguito alcun comando: mantenere l'allineamento richiede stabilire un meccanismo di sincronizzazione che rispetti, oppure aggiorni, questa responsabilità.

## Fix options

### Consentire all'estensione di sincronizzare il titolo

Consentire all'estensione di aggiornare soltanto il titolo degli annunci Writing quando osserva una modifica del titolo della Draft. L'associazione iniziale resta nella CLI; identità, appartenenza e consegna non cambiano. Si allinea la persistenza alla Board anche per modifiche dirette, con una deroga esplicita al requisito tecnico sulla scrittura degli annunci.

### Delegare la sincronizzazione a un comando CLI

Mantenere la CLI come unico autore degli annunci e prevedere un comando di sincronizzazione richiamato dall'estensione quando cambia il titolo di una Draft annunciata, anche nei worktree. Non cambia il comportamento del ghost, ma richiede un nuovo contratto tecnico e la gestione dell'esecuzione del comando per ogni modifica pertinente.

## Where in the code

src/core/announcements.ts: bindDraft, markDraftActivity; src/core/snapshot.ts: buildSnapshot, announcementView; extension/src/host/announcements.ts: watchAnnouncements; extension/src/host/controller.ts: watchChanges
