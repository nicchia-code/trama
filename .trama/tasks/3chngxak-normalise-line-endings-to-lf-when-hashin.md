---
column: done
technical: true
refs:
  - requirements/data#proposal
drift: null
proposal: null
agent: false
created: 2026-10-11T17:06:30.523Z
finished: 2026-10-11T17:13:48.079Z
---
# Normalise line endings to LF when hashing and comparing Proposal files

Ogni hash di `base` e ogni confronto fra il contenuto di una Proposal e quello dei file sotto `.trama/` deve usare il contenuto con i fine riga normalizzati da CRLF a LF. Oggi i file del Modello e dei Requisiti, sia quelli sotto `.trama/` sia quelli della Proposal, sono letti così come stanno su disco e hashati senza normalizzare: un checkout in CRLF (`core.autocrlf`) dà un hash diverso da quello di Linux e rende obsoleta una Proposal. Lo stesso vale per i confronti fra versione di partenza e versione applicata (le modifiche mostrate, la verifica dei file toccati, l'ambito delle Funzionalità da riscansionare, il controllo se un file è cambiato). A lavoro finito: una Proposal scritta su Linux non è obsoleta su un checkout CRLF e viceversa, e lo stesso contenuto con CRLF o LF produce lo stesso hash e nessuna differenza. Le Proposal già scritte non vengono riscritte: i loro hash di `base` restano quelli registrati.
