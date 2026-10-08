---
column: done
technical: false
refs:
  - announcement/Announced/time.QUIET_PERIOD_ELAPSED
  - requirements/rules#announcement
  - requirements/tech#announcement
drift: ha8ntnlr
proposal: null
agent: false
created: 2026-10-08T06:14:47.989Z
finished: 2026-10-08T06:16:15.539Z
---
# Fix code to match the Model: Sending a design request restarts the quiet period of the agent's announcements

## What happens

Quando il developer manda una richiesta di design da un launcher del terminale, l'annuncio che Trama crea per quella richiesta fa **ripartire i quindici minuti di quiete di tutti gli annunci già in attesa**, anche di quelli di un altro terminale o senza terminale. Così i ghost di un agente che si è già fermato restano sulla Board fino a quindici minuti in più.

Inoltre, per farlo, l'estensione riscrive il momento dell'ultima attività in ogni file di annuncio, non solo nel proprio.

## What should happen

I quindici minuti ripartono solo per attività **dell'agente**: annunciare una scheda o un controllo, cambiare una Draft annunciata, archiviare una scheda, cambiare la fase di un controllo (`rules#announcement`). Una richiesta di design mandata dal developer non è attività dell'agente e non deve spostare il ritiro dei ghost già in attesa.

L'estensione cancella gli annunci quando li ritira e può aggiornare solo l'H1 di un annuncio Writing; non riscrive gli altri campi degli annunci esistenti (`tech#announcement`).

## Chosen option

**Request announcement refreshes nothing**

L'annuncio di una richiesta di design non rinfresca gli altri annunci, e la sua nascita fa partire i quindici minuti solo per sé: il ritiro per quiete degli altri ghost torna puntuale. Costo: il conteggio della quiete non può più essere un unico orologio per tutti gli annunci, ma deve tenere conto di quando è nato ciascuno.

## Where in the code

src/core/announcements.ts: `announce` chiama `markActivity` anche per un annuncio con source `request`; lo chiama extension/src/host/agent.ts (`announceDesignRequest`). Il conteggio globale è `isQuiet`, usato da extension/src/host/announcements.ts.
