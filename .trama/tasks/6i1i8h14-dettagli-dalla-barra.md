---
column: done
technical: false
refs:
  - developer.OPEN_GHOST_DETAILS
  - panel/Closed/developer.OPEN_GHOST_DETAILS
  - panel/Open/developer.OPEN_GHOST_DETAILS
drift: null
proposal: hf9h1qab
agent: false
created: 2026-10-23T12:43:49.573Z
finished: 2026-10-23T12:46:51.348Z
---
# Dettagli dalla barra

Quando il Task è finito, scegliere un fantasma dalla barra di stato (dal QuickPick, o cliccare la voce `Trama Activities` quando c'è un solo fantasma) è l'Evento `developer.OPEN_GHOST_DETAILS`. A pannello chiuso (`panel/Closed/developer.OPEN_GHOST_DETAILS`) il pannello si apre in primo piano sulla Board; a pannello aperto (`panel/Open/developer.OPEN_GHOST_DETAILS`) viene portato in primo piano e passa alla Board, qualunque scheda mostrasse. Sulla Board si apre il dialogo `GhostDetails` di quell'annuncio, che sostituisce ogni altro dialogo di dettagli della Board; il contenuto è lo stesso dei fantasmi sulla Board. Se il fantasma è già sparito, si vede la Board senza dialogo.

Quando un dialogo aperto così si chiude (X, Esc, clic fuori, o perché il fantasma è sparito) il focus va alla colonna `Backlog` (i fantasmi senza colonna non hanno una carta a cui tornare).

## Dove lavorare

- `extension/src/protocol.ts`: nuova opzione `NavigateOptions.ghost` (id dell'annuncio), usata con `navigate` sulla vista `board`.
- `extension/src/host/controller.ts`: `pendingView`, oggi tipato `"settings"`, si allarga a una vista con le sue opzioni, così un pannello appena creato e non ancora pronto la riceve su `ready` come avviene per `openSettings`; `open`/`revealPanel` per aprire o portare in primo piano il pannello.
- `extension/src/webview/main.tsx` e `extension/src/webview/types.ts` (`show(options)` della Board) passano l'opzione alla Board.
- `extension/src/webview/board/index.tsx`: lo stato `ghostOf` apre `GhostDetails` per quell'id cercando tra tutti i fantasmi dello snapshot, compresi quelli senza colonna (oggi cerca solo tra `placedGhosts`); la chiusura o la sparizione manda il focus a `[data-column]` della colonna Backlog. Dialogo in `extension/src/webview/board/dialogs.tsx` (`GhostDetailsDialog`).

I test di rendering della Board che fissano `System Activities` (`test/board-render.test.tsx`) vanno aggiornati dove toccano questo comportamento.
