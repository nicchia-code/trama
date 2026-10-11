---
status: approved
kind: resolution
automatic: true
drifts:
  - drift: cx2e4bom
    decision: fix-code
    option: 1
  - drift: iuje6sft
    decision: fix-code
    option: 1
  - drift: m7j2ym2v
    decision: fix-code
    option: 1
base: {}
delete: []
created: 2026-10-11T09:50:01.519Z
---
# Fix three autopilot and ghost Drifts in the code

Risoluzione automatica: per ogni Drift si corregge il codice con la prima Fix option.

- cx2e4bom – The ghost of a Drift with a Draft says Writing instead of Writing the Proposal: correggere il codice (opzione 1, mostrare Writing the Proposal sui ghost dei Drift).
- iuje6sft – A skipped question shows an autopilot failed badge, also with the autopilot disabled: correggere il codice (opzione 1, mostrare il badge solo con l'autopilota attivo).
- m7j2ym2v – A scan that ends after its check was declared does not lift the wait after a coordinator takeover: correggere il codice (opzione 1, togliere l'attesa alla fine del lavoro dello scan).
