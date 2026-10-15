---
technical: true
refs:
  - requirements/ui#task
---
# Show a Task closed without changes on the Board and in the command line

- Nella Board, la scheda di un Task chiuso senza modifiche, e la sua riga dentro una scheda di design, portano il badge testuale `no changes` accanto agli altri badge, con tooltip e nome accessibile `Closed without changes: <nota>`. Il badge non dipende dal colore, non sposta il focus e sparisce quando il Task lascia Done.
- Nei dettagli del Task («Show details») la nota sta in un blocco `Check note` prima del corpo, resa come Markdown.
- `trama board` e `trama task list` segnano il Task `(no changes)`; `trama task show` ha subito dopo il titolo la riga `Closed without changes` e poi un blocco con l'intestazione "Check note" e la nota.
- I testi sono in inglese, nella lingua fissa dell'interfaccia.
