---
status: approved
kind: resolution
automatic: true
drifts:
  - drift: fndsufvs
    decision: fix-code
    option: 1
  - drift: e71a2csl
    decision: fix-code
    option: 1
  - drift: ytp14t5l
    decision: fix-code
    option: 1
base: {}
delete: []
created: 2026-10-11T06:42:44.310Z
---
# Resolve autopilot delivery and failure Drifts

Risoluzione automatica dei Drift della raccolta:
- D1 – The automatic start is retried at every check when the chat cannot take it: da correggere nel codice (opzione 1, fermarsi dopo una consegna fallita finché il developer non lo chiede).
- D2 – A Resolve Drifts or scan request counts as started when its instruction never left Trama: da correggere nel codice (opzione 1, agire solo dopo un invio reale).
- D3 – A resolution that ends without a Draft or abnormally replaces the reasons of its Drifts: da correggere nel codice (opzione 1, segnare solo i Drift senza esito).
