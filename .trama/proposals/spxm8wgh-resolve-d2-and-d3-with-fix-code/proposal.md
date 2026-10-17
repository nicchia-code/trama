---
status: approved
kind: resolution
automatic: true
drifts:
  - drift: zrf5vekc
    decision: fix-code
    option: 1
  - drift: 5zmo1dp0
    decision: fix-code
    option: 1
base: {}
delete: []
created: 2026-10-16T13:43:33.739Z
---
# Correzione nel codice di due Drift

Risoluzione automatica dei Drift:
- zrf5vekc – Il programma trama incluso nell'estensione non arriva nel PATH dei terminali dell'editor: correggere il codice preparando il PATH dei terminali all'avvio dell'estensione.
- 5zmo1dp0 – Stato cambiato fuori dall'ambito con la Machine: correggere il codice così che gli Stati, le Transizioni e gli Eventi cambiati entrino nell'ambito anche quando cambia la descrizione della Machine.
