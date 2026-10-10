---
column: done
technical: false
refs:
  - task
  - requirements/rules#task
  - requirements/tech#task
drift: null
proposal: o3h29jss
agent: false
created: 2026-10-10T12:55:47.088Z
finished: 2026-10-10T15:01:37.461Z
---
# Calcolare l’ambito della scansione mirata dai Task conclusi

Deve essere disponibile `trama task scope <id> [<id>…]` per ottenere l’unione degli elementi del Modello a cui puntano i Task nominati e delle Transition che vi entrano, con lo stesso calcolo dell’ambito di una Proposal. Un riferimento a una sezione dei Requisiti vale come l’elemento che la intitola; un’Area o General non aggiungono nulla. La risposta testuale presenta `## Scan scope` con riferimenti e motivi `changed` o `leads into a change`; con `--json` è una lista di `{ ref, reason }`. Un Task inesistente è un errore d’uso; l’ambito vuoto è dichiarato ed esce con 0. Il comando non cambia le schede. Questo Task fornisce l’ambito; la scelta della scansione che l’agente esegue alla fine della corsa è una differenza distinta.
