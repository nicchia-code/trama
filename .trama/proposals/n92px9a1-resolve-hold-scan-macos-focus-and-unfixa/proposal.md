---
status: approved
kind: resolution
drifts:
  - drift: ndeudi4n
    decision: fix-code
    option: 1
  - drift: mdzkkarx
    decision: fix-code
    option: 1
  - drift: k8nlvrbi
    decision: fix-code
    option: 1
base:
  requirements/rules/scan-hold.md: d160470e81369468929109c27c9b4e0dd4aa68b591d3b37ffc8e4cc09b635bbf
delete: []
created: 2026-10-09T19:03:26.373Z
---
# Resolve Hold scan, macOS focus and unfixable-Drift approval

Risoluzione dei Drift:

- ndeudi4n – Command-line approvals with Hold scan on are neither held nor scanned: correggere il codice. Con Hold scan acceso, un'approvazione dalla riga di comando entra nel sospeso alle stesse condizioni del pannello; il Requisito che lo escludeva cambia di conseguenza.
- mdzkkarx – Opening an external window on macOS brings Terminal.app to the front: correggere il codice. La finestra nuova di Terminal.app si apre senza essere portata in primo piano.
- k8nlvrbi – Approving a resolution that removes a fix-code Drift's Machine leaves it approved with Drifts open: correggere il codice. Il controllo sui Drift non più correggibili guarda il Modello come sarà dopo la risoluzione, così consegna e approvazione sono rifiutate prima di cambiare qualcosa.
