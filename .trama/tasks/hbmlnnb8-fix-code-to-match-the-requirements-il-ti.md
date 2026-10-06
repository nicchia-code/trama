---
column: done
technical: true
refs:
  - requirements/tech#announcement
drift: ulcg72ne
proposal: null
agent: false
created: 2026-10-06T19:43:33.739Z
finished: 2026-10-06T20:44:30.116Z
---
# Fix code to match the Requirements: Il titolo Writing richiede una sincronizzazione fuori dalla CLI

## What happens

Quando l'agente cambia direttamente il titolo di una Draft annunciata, il ghost Writing prende subito il nuovo titolo alla lettura della Board, senza eseguire un comando Trama. Il titolo persistito dell'annuncio resta precedente. È possibile correggere l'associazione iniziale nella CLI, ma questo non copre le successive modifiche dirette, consentite durante la scrittura della Draft.

## What should happen

Il titolo persistito deve coincidere con quello mostrato sul ghost per tutta la vita dell'annuncio. Il requisito tecnico assegna però la scrittura degli annunci alla **riga di comando**, mentre l'estensione può cancellarli e il Snapshot li legge. Dopo una modifica diretta della Draft non viene eseguito alcun comando: mantenere l'allineamento richiede stabilire un meccanismo di sincronizzazione che rispetti, oppure aggiorni, questa responsabilità.

## Chosen option

**Consentire all'estensione di sincronizzare il titolo**

Consentire all'estensione di aggiornare soltanto il titolo degli annunci Writing quando osserva una modifica del titolo della Draft. L'associazione iniziale resta nella CLI; identità, appartenenza e consegna non cambiano. Si allinea la persistenza alla Board anche per modifiche dirette, con una deroga esplicita al requisito tecnico sulla scrittura degli annunci.

## Where in the code

src/core/announcements.ts: bindDraft, markDraftActivity; src/core/snapshot.ts: buildSnapshot, announcementView; extension/src/host/announcements.ts: watchAnnouncements; extension/src/host/controller.ts: watchChanges
