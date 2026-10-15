---
status: approved
kind: resolution
automatic: true
drifts:
  - drift: bqf4u6b5
    decision: fix-code
    option: 1
  - drift: 3erbcpqf
    decision: fix-code
    option: 1
  - drift: tzjdzu3e
    decision: fix-code
    option: 1
  - drift: 50amblox
    decision: fix-code
    option: 1
base: {}
delete: []
created: 2026-10-14T12:26:00.993Z
---
# Resolve autopilot Drifts on task files, question rounds and automatic runs

Risoluzione automatica dei Drift autorizzati, ciascuno con la sua prima Fix option:

- D3 – Il comando accetta un file di Task anche dove la Proposal non ne può contenere: correggere il codice, rifiutando subito il file di Task per risoluzioni e Proposal allegate a un Drift.
- D4 – Il round di domande si interrompe quando il progetto scompare dalla finestra: correggere il codice, tenendo il round finché la finestra è aperta.
- D5 – Il pre-flight interrotto di un Run non registra uno scan fallito: correggere il codice, registrando il pre-flight interrotto come scan fallito.
- D6 – Una finestra chiusa durante un Run automatico lascia i Task non finiti senza motivo: correggere il codice, segnando i Task non finiti come falliti per la finestra persa.
