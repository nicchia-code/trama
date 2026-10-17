---
column: done
technical: true
refs:
  - requirements/ui#announcement
  - requirements/ui#drift-resolution
drift: null
proposal: iwham416
agent: false
created: 2026-10-17T10:26:30.532Z
finished: 2026-10-17T11:00:57.503Z
---
# Ghost `Scan`, `Resolve` e `Import` in Active

Quando il Task è finito, nella colonna Active della Board:

- Il ghost del controllo di uno scan chiesto a mano mostra il tipo `Scan` (gli altri controlli restano `Check`), il titolo (per esempio `Scanning System`) e la riga di fase; nome accessibile invariato `Agent checking the code: <title>, <phase>`.
- Il ghost della Proposal di risoluzione annunciata da Trama al lancio di Resolve Drifts (con `Resolve all`, `Resolve` o dalla raccolta automatica, con qualunque agente) mostra il tipo `Resolve` e il titolo calcolato dal campo `drifts`: `Resolving Drift <numero breve>` per un Drift solo, `Resolving <N> Drifts` per più Drift; un Drift già chiuso o senza numero breve è nominato con la sua identità permanente. Ha la riga di fase delle Proposal (`Preparing`, `Writing`, `Waiting for your answers` mentre il round di domande è aperto) e tiene il titolo fino alla consegna, anche dopo che la Draft esiste. Nome accessibile `Agent resolving Drifts: <title>, <phase>`. Sparisce il vecchio comportamento con il titolo `Resolve Drifts` poi sostituito da quello della Draft.
- Il ghost di un lavoro di import mostra il tipo `Import` e il titolo `Importing from code`, senza riga di fase, con nome accessibile `Agent importing the code`, e sparisce senza avviso quando l'agente finisce.

Tutti restano non cliccabili, non focalizzabili, non contati, con lo stesso scheletro e shimmer degli altri ghost, nell'ordine di annuncio. Aggiornare i test del webview sui ghost.
