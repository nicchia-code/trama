---
column: done
technical: false
refs:
  - design-request/Sent/proposal.SUBMITTED
  - requirements/rules#design-request
drift: null
proposal: dk0grfyg
agent: false
created: 2026-10-17T10:26:29.439Z
finished: 2026-10-17T12:20:27.140Z
---
# Setup approvato avvia tutti i Task in To do come Run all

Quando l'estensione vede sparire il file di una richiesta di setup e la Proposal di setup legata è approvata, Trama avvia tutti i Task in To do esattamente come il pulsante `Run all` della Board (non più «Run Ready Tasks»); se il Run è rifiutato compare l'avviso «Trama: <messaggio>» e la Proposal resta approvata. Se la Proposal è rimasta aperta resta l'avviso «Trama: the setup Proposal could not be approved on its own: <motivo>. Review it on the Board.» (o «it is still open»); nessuna Proposal legata, o nessun editor con il progetto aperto: non parte nulla e i Task restano in To do.

Il codice che oggi chiama l'azione di Run Ready Tasks per il setup deve usare la stessa azione di `Run all`, senza un percorso separato né un alias del vecchio nome; aggiornare i test relativi.
