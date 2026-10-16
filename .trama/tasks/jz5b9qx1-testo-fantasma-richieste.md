---
column: done
technical: false
refs:
  - design-request
  - requirements/ui#design-request
  - requirements/rules#design-request
  - requirements/tech#design-request
drift: null
proposal: 22tzcpm3
agent: false
created: 2026-10-16T05:17:54.965Z
finished: 2026-10-16T05:29:48.574Z
---
# Mostrare il testo fantasma nelle schede delle richieste scritte

Quando il Task è finito, la scheda di una richiesta scritta mai inviata (in Writing) mostra un testo fantasma finché il documento non ha nessun carattere, nemmeno uno spazio o un a capo:

- per una richiesta di Design…: «Describe the change to design: behaviour, edge cases, requirements. Close this tab or press Send to agent when you are done.»
- per una richiesta di setup aperta da Start from Scratch: «Describe the application to build: what it does and who it is for. Close this tab or press Send to agent when you are done.»

Il testo è grigio (il colore del testo disattivato del tema), sta all'inizio della prima riga, su una riga sola, in inglese, e non segue `trama.language`. Sparisce alla prima battuta e torna se il developer cancella tutto. Vale anche per una scheda che l'editor ripristina dopo un riavvio. Una richiesta inviata (Sent) non lo mostra mai, nemmeno se il developer la svuota.

Il testo fantasma non fa parte della richiesta: il file resta vuoto alla nascita e non riceve mai quel testo, il titolo della richiesta e la regola del testo vuoto non lo vedono (Send to agent su un documento che mostra solo il testo fantasma avvisa come oggi; chiudere la scheda lo cancella come oggi), e l'agente non lo riceve.

Si realizza come in `tech#design-request`: due tipi di decorazione creati una volta dall'host e liberati con lui, applicati a `Range(0, 0, 0, 0)` degli editor visibili dei file di richiesta mai inviati quando `document.getText()` è vuoto, ricalcolati al cambio degli editor visibili, a ogni modifica di un file di richiesta e quando la richiesta diventa inviata. Il tipo si sceglie con l'elenco delle richieste di setup, come per l'istruzione.

Aggiornare il finto `vscode` dei test dell'host delle richieste con quello che serve alle decorazioni, e la documentazione: `CHANGELOG.md`, `extension/README.md` (la frase sui pulsanti Design…) e lo script di accettazione `docs/uat.md` con un passo che controlla i due testi, la loro scomparsa alla prima battuta e l'assenza su una richiesta inviata.
