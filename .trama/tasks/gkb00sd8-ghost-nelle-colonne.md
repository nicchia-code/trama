---
column: done
technical: false
refs:
  - panel/Board
  - panel/Open/developer.SHOW_BOARD
  - design-request/Writing/developer.ASK_AGENT
  - requirements/ui#panel/Board
  - requirements/data#task
  - requirements/ui#drift-resolution
  - requirements/ui#drift-resolution/Unifying
  - requirements/ui#announcement
  - requirements/rules#announcement
drift: null
proposal: hf9h1qab
agent: false
created: 2026-10-23T12:43:49.573Z
finished: 2026-10-23T12:48:00.764Z
---
# Fantasmi nelle colonne

Quando il Task è fatto, la Board non ha più la colonna `System Activities`: le colonne sono tre, `Backlog`, `Active` e `History`. Con `History` chiusa, `Backlog` e `Active` si dividono lo spazio (più la striscia stretta di `History` chiusa); con `History` aperta le tre colonne si dividono la larghezza.

Ogni fantasma sta nella colonna a cui appartiene la sua carta vera:
- i fantasmi di una Proposal (compresa quella di una richiesta di design, con il titolo della richiesta, e quella di Resolve) e di un Drift (compreso Unify) stanno in fondo a `Backlog`;
- i fantasmi dei Task stanno in fondo a `Active`;
- i fantasmi che non hanno colonna (check/scan, comparison, work: Import, Quick, Ask) non compaiono sulla Board: vanno nella status bar, costruita da un altro Task di questa Proposal.

Nella colonna i fantasmi stanno dopo le carte vere e prima del bottone in fondo (`+ Add Work Item`, `Run all`), nell'ordine in cui sono stati annunciati; quando arriva la carta vera, questa prende il loro posto. Una colonna che ha solo fantasmi mostra comunque il suo testo vuoto (`Nothing to decide`, `Nothing active`) sopra i fantasmi. I fantasmi non si contano mai: né nel numero della colonna né nel numero della scheda Board.

La colonna di ogni tipo di fantasma è decisa da una sola funzione pura in `src/core` (risultato `backlog` | `active` | `none` a partire dal tipo dell'annuncio: proposal, resolve, drift, unify → `backlog`; task → `active`; check, scan, comparison, work → `none`), coperta da test `bun:test`. Questo Task la crea; il Task della status bar la riusa per sapere quali fantasmi non hanno posto sulla Board.

Se la finestra dei dettagli di un fantasma della Board si chiude perché il fantasma è sparito, il focus va alla colonna in cui stava il fantasma (non più a `System Activities`). L'aspetto della carta fantasma, la riga delle note e il contenuto della finestra dei dettagli restano come sono.

Dove lavorare:
- `src/core/announcements.ts` (`AnnouncementKind`): nuova funzione pura della colonna del fantasma; `src/core/snapshot.ts` (`AnnouncementView`, commento ormai vecchio vicino alla sua definizione).
- `extension/src/webview/board/logic.ts`: togliere `system` da `CardColumnId`/`CARD_COLUMNS`/`COLUMN_ORDER`/`COLUMN_TITLES`/`EMPTY_HINTS` (`Nothing running`); sostituire `GHOST_COLUMN` e `announcedGhosts` (oggi tutti in `system` con `index: 0`) con un piazzamento per colonna in fondo, usando la funzione di `src/core` e scartando i fantasmi `none`; `interleave` e `PlacedGhost.index` (indice oltre la fine = in fondo).
- `extension/src/webview/board/index.tsx`: `CardColumn` (fantasmi inseriti solo in `GHOST_COLUMN`, testo vuoto solo senza elementi, conteggio), griglia `repeat(4, …)`/`repeat(3, …) 40px` da ridurre di una colonna, focus `[data-column="${GHOST_COLUMN}"]` alla sparizione del fantasma da spostare alla colonna del fantasma.
- `extension/src/host/design-requests.ts` (titolo del fantasma = titolo della richiesta): nessun cambio di titolo, solo il fantasma ora sta in `Backlog`.

Vanno aggiornati i test che fissano `System Activities` (`test/board-logic.test.ts`, `test/board-render.test.tsx`, `test/host-agent-terminals.test.ts`) e il `CHANGELOG.md` (le voci che nominano `System Activities`, più una voce che dice che la colonna non c'è più e dove sono andati i fantasmi); anche le descrizioni dei fantasmi in `docs/` che nominano la colonna vanno allineate.
