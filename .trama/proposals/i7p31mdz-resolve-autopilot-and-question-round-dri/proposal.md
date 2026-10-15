---
status: approved
kind: resolution
automatic: true
drifts:
  - drift: 1301dta4
    decision: fix-code
    option: 1
  - drift: a6obqp90
    decision: fix-code
    option: 1
  - drift: qbqvegxv
    decision: fix-code
    option: 1
  - drift: ci10zl3w
    decision: fix-code
    option: 1
base: {}
delete: []
created: 2026-10-14T12:55:41.975Z
---
# Resolve autopilot and question round Drifts

Risoluzione automatica dei Drift autorizzati per questa raccolta, ciascuno con la prima opzione di correzione:

- D3 – Ritirare la delega segna come falliti i Task non ancora avviati: correggere il codice (ritiro senza badge sui Task non avviati).
- D4 – Un Drift critico rimasto manuale mostra «autopilot failed»: correggere il codice (escludere il passo senza segnarlo).
- D5 – Reopen senza progetto offre di inizializzare invece di mostrare il round: correggere il codice (mostrare il round anche senza progetto).
- D6 – Un round aperto resta sopra il pannello quando la finestra passa a un altro progetto: correggere il codice (tenere il round in coda finché torna il suo progetto).
