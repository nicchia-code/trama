---
status: approved
kind: resolution
automatic: true
drifts:
  - drift: ryovya1u
    decision: fix-code
    option: 1
  - drift: ninpxrep
    decision: fix-code
    option: 1
  - drift: 1alqj9qe
    decision: fix-code
    option: 1
  - drift: e5g1vmgl
    decision: fix-code
    option: 1
  - drift: a01udx8z
    decision: fix-code
    option: 1
  - drift: slwd4dzx
    decision: fix-code
    option: 1
  - drift: v6zmsph9
    decision: fix-code
    option: 1
base: {}
delete: []
created: 2026-10-11T05:06:52.084Z
---
# Automatic resolution of seven Drifts

Risoluzione automatica: per ciascun Drift si applica la prima opzione di correzione nel codice.
- D1 – Ghost of a Drift with a Draft shows the Draft's title: correzione nel codice (opzione 1, il ghost di un Drift mostra il titolo del Drift).
- D2 – A finished check leaves its outcome in a file: correzione nel codice (opzione 1, l'esito passa dal canale locale).
- D3 – The automatic Run waits for scans started after the collection: correzione nel codice (opzione 1, le scansioni successive non bloccano la Run).
- D4 – A developer scan that ends without a successful check does not make failed cases re-evaluable: correzione nel codice (opzione 1, rivalutazione a ogni scansione del developer).
- D5 – A System scan started in a terminal is never remembered for the Scan button: correzione nel codice (opzione 1, si segnala di nuovo l'avvio da terminale).
- D6 – An unrecognized autopilot value starts Resolve Drifts as if the delegation were on: correzione nel codice (opzione 1, la modalità si legge in un solo punto).
- D7 – Instructions of tracked jobs sent to the terminal are no longer one line: correzione nel codice (opzione 1, l'ID del job solo nella chat).
