---
column: done
technical: true
refs:
  - requirements/tech#announcement
drift: null
proposal: ndrmsitf
agent: false
created: 2026-10-10T20:33:23.370Z
finished: 2026-10-10T20:45:36.380Z
---
# Report failed check completion

Quando un controllo viene chiuso con esito fallito, Trama deve comunicarlo esplicitamente al coordinatore invece di segnalarlo come riuscito; l'annuncio viene comunque consegnato e rimosso, mentre nessun esito di successo viene emesso.
