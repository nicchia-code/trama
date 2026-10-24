---
technical: false
refs:
  - omp-chat-conversation
  - requirements/ui#omp-chat-conversation
  - requirements/tech#omp-chat-conversation
---
# Chiamate non cliccabili

In ogni conversazione di omp Chat, General compresa, le righe delle chiamate agli strumenti (per esempio «Writing tasks») oggi si cliccano per espandere l'esito, e il percorso sotto una modifica apre il file nell'editor. Quando il Task è finito:

- La riga di una chiamata è di sola lettura: icona (o logo), titolo e stato (`Loader`, `Check`, `X` nel colore di errore), senza pulsante, senza fuoco da tastiera, senza chevron né `aria-expanded`, e non mostra l'esito.
- Una chiamata fallita mostra sotto la riga, rientrata, la prima riga non vuota dell'errore di omp, nel colore di errore e in testo piccolo, troncata con `…` a una riga; senza testo d'errore non mostra nulla in più.
- Una modifica mostra sotto la riga il percorso di ogni file toccato, in carattere a spaziatura fissa e in testo secondario, come testo semplice che non apre nulla.
- Titolo, percorsi e riga d'errore si possono selezionare e copiare.
- Il messaggio `openFile` di omp Chat sparisce (protocollo, validazione dell'host, `view-model.ts`, `view.ts`, azione del webview); quello del pannello di Trama resta. La trascrizione tiene solo la riga d'errore delle chiamate fallite, calcolata da una funzione pura con il suo test `bun:test`.
- Restano come oggi: il blocco `Thinking`, la riga dell'allegato dell'istruzione, il riquadro `Plan`, i moduli, le richieste di permesso e i loghi delle chiamate.
- I test del webview che espandevano l'esito o aprivano il file si tolgono; un test prova la riga d'errore di una chiamata fallita e che la riga non è un pulsante.
