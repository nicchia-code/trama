---
column: done
technical: false
refs:
  - requirements/ui#task
  - panel/Board
  - panel/Open/developer.SHOW_BOARD
drift: null
proposal: drdvf0p2
agent: false
created: 2026-10-22T05:44:21.487Z
finished: 2026-10-22T05:52:05.746Z
---
# Anteprime immagini nei Task

Un Task di una Proposal può portare immagini per chi lo realizza, conservate in `.trama/task-images/<identità del Task>/` (ordine: data di modifica, poi nome). Il developer le deve vedere in anteprima nei dettagli del Task, prima e dopo l'approvazione, e poterle aprire intere.

Quando il Task è fatto vale quanto segue:

- Il quadro mandato al pannello porta, per ogni Task (nella Board e nei Task delle Proposal nei dettagli del Diagramma), la lista delle sue immagini che esistono: nome e indirizzo per il webview fatto con `Webview.asWebviewUri`. La cartella `.trama/task-images/` è fra le `localResourceRoots` del webview (oggi solo `dist`, in `extension/src/host/controller.ts`). Coinvolti `src/core/snapshot.ts` e il codice dell'host che prepara il quadro.
- Nei dettagli di un Task con immagini, sotto il corpo, c'è una riga di anteprime, una per immagine, nell'ordine in cui sono state legate: miniature alte al più 96 px che conservano le proporzioni e vanno a capo quando lo spazio manca. Vale per il corpo aperto con `Show details` sulla scheda del Task in Active (`extension/src/webview/board/cards.tsx`) e per la sezione `Tasks` dei dettagli di una Proposal nel Diagramma (`extension/src/webview/diagram/panel.tsx`). Il toggle `Show details` c'è anche quando il Task ha immagini ma nessun corpo.
- Ogni anteprima è un pulsante con tooltip e nome accessibile `Open image <nome del file>`; clic, Invio o spazio aprono il file intero in una scheda dell'editor, con il visualizzatore di immagini dell'editor; il pannello resta dov'era.
- Il clic manda all'host il messaggio `openTaskImage { task, name }`. `extension/src/host/messages.ts` lo accetta solo per un'immagine esistente di quel Task; l'host la apre con il comando `vscode.open` in una scheda non in anteprima, senza spostare il focus dal pannello.
- Un'immagine che non c'è più non ha anteprima; un Task senza immagini non mostra nulla di nuovo, senza riga.
- `trama task show <id>` ha, dopo il corpo, un blocco con l'intestazione `Images` e il percorso assoluto di ogni immagine, uno per riga, e il `--json` porta `images`; `trama proposal show <id>` aggiunge sotto ogni Task che ne ha la riga `Images: <nomi dei file>`. Senza immagini non c'è nulla. I testi sono in inglese.
- Nessuna libreria nuova.
