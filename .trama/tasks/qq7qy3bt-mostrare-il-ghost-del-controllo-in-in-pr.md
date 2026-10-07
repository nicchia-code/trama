---
column: done
technical: false
refs:
  - panel/Board
  - panel/Open/developer.SHOW_BOARD
  - announcement/Checking
  - announcement/Announced
  - requirements/ui#panel/Board
  - requirements/rules#announcement
drift: null
proposal: h1ezgi8s
agent: false
created: 2026-10-06T21:29:22.919Z
finished: 2026-10-06T21:31:58.673Z
---
# Mostrare il ghost del controllo in In progress e l'avviso del controllo ritirato

Mentre esiste un controllo annunciato, la colonna In progress della Board ne mostra il ghost, dopo le schede vere, con lo stesso scheletro, shimmer e limiti degli altri ghost: non si clicca, non si mette a fuoco, non conta nel numero della colonna né in quello della scheda Board.

Quando è fatto:
- il ghost mostra il tipo `Check`, il titolo e la riga di fase: `Verifying (tests, lint, build)` in Verifying, `Scanning` in Scanning; un round di domande aperto non la cambia;
- il nome accessibile è `Agent checking the code: <title>, <phase>`;
- più controlli stanno nell'ordine in cui sono stati annunciati;
- il cambio di fase si vede da sé; quando l'agente dice che il controllo è finito il ghost sparisce senza avviso;
- un controllo ritirato per fine del comando, chiusura del terminale, interruzione della chat di Cursor o quindici minuti di quiete dà l'avviso `The agent stopped before finishing <title>.`, uno per controllo, con il pulsante di chiusura e la durata degli altri avvisi; alla chiusura di una conversazione di Cursor e all'avvio dell'editor nessun avviso;
- il ghost e l'avviso sono tenuti aggiornati anche mentre è mostrata un'altra scheda, e riaprendo il pannello il ghost di un controllo ancora in corso ritorna.
