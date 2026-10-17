---
status: approved
kind: resolution
drifts:
  - drift: zi72zwsn
    decision: fix-code
    option: 1
base: {}
delete: []
created: 2026-10-16T13:18:49.063Z
---
# Risoluzione: controllo finale fallito

Risolve un Drift:

- zi72zwsn – Dopo un controllo finale fallito, il Run automatico ferma di nuovo anche i Task indipendenti: si corregge il codice. Insieme al controllo finale fallito il Run dichiara quale Task ha rotto la verifica; si fermano solo quel Task e quelli che ne dipendono, gli indipendenti proseguono. Senza attribuzione la prosecuzione si ferma come oggi.
