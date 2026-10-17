---
column: done
technical: false
refs:
  - work
  - requirements/ui#voce-history
drift: null
proposal: uvn8ulmq
agent: false
created: 2026-10-17T10:26:31.354Z
finished: 2026-10-17T13:03:58.327Z
---
# Scheda della voce nella colonna History e modale dei dettagli

Quando il Task è finito, nel `work` il lavoro finito non resta sulla Board come Task: la colonna History mostra le voci della Snapshot, una scheda per voce, ordinate per data (`updated`), e i Task in Done non compaiono più nelle colonne.

La scheda ha titolo, data e riassunto: la data è `HH:MM` locale nei gruppi `Today` e `Yesterday`, giorno e ora per esteso nella lingua dell'editor negli altri, con tooltip sempre a data e ora complete; il riassunto è Markdown solo in linea, intero. La scheda non ha pulsanti salvo la «i», non si apre cliccandola e non conta nel numero della tab Board.

La «i», a destra del titolo, è un pulsante a sola icona (codicon `info`, 16 px, colore del testo) con tooltip e nome accessibile `Show the Tasks of <titolo>`. Apre un `<dialog>` del webview con `showModal()` (nessuna libreria nuova) con: il titolo della voce, sotto la data completa, il testo completo reso dal renderer Markdown del pannello, poi la sezione `Tasks` con un Task per riga in ordine di creazione: pallino di stato, ID, titolo, tag, data di fine quando c'è, riferimenti come chip che portano al Diagramma o alla scheda Requirements come quelli dei Drift. Un Task non più Done mostra il suo stato di adesso; uno che non esiste più mostra la sua identità e `no longer exists`.

La modale si chiude con `Close` (icona `close`), con Esc e cliccando fuori; seguire un chip la chiude e apre il Diagramma o Requirements. All'apertura il focus va su `Close`, resta nella modale e alla chiusura torna alla «i» che l'ha aperta; ha ruolo di dialogo modale con il nome della voce e scorre al suo interno. Si chiude da sola quando il pannello si chiude o la voce sparisce dai file. Testi del pannello in inglese. Aggiungere i test del webview per scheda, date e modale.
