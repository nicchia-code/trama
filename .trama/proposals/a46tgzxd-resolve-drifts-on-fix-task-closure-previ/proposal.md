---
status: approved
kind: resolution
drifts:
  - drift: xujjy480
    decision: fix-code
    option: 1
  - drift: b4bxfk0m
    decision: proposal
  - drift: 20f172ce
    decision: fix-code
    option: 1
  - drift: uhf36kwa
    decision: proposal
base:
  agent-launching/drift-resolution.md: bb65efab48e13b2181836b75cda7e041db9cacc714c3b17083831b01c17a4226
  requirements/rules/project.md: a3985a61794dbcf992f7c6da3e8c260a9d2c94ae83651978fa48832908b6b507
  requirements/data/work.md: 3d09560a72aefa319f2e5223d074ef899fe45814d90b99dc4d2f4e323365d6ff
  requirements/rules/drifts.md: 832e583e2bc591e568cd4dff08fdbab038255e3a3694aec5b5113306accc6cf8
delete: []
created: 2026-10-14T15:59:50.334Z
---
# Resolve drifts on fix Task closure, previous rewrite, Task files and automatic Run

Risoluzione dei Drift:
- xujjy480 – Closing a Task that is not the fix Task dismisses the Drift: si corregge il codice, solo il Task di correzione registrato nel Drift può chiuderlo senza modifiche.
- b4bxfk0m – Identity rewrite changes the previous reference of recurring Drifts: si aggiornano i Requisiti, la riscrittura delle identità segue anche il Drift precedente.
- 20f172ce – Proposal edit accepts Task files in Proposals that cannot hold Tasks: si corregge il codice, il comando rifiuta il file di Task prima di crearlo.
- uhf36kwa – Automatic Run starts while a scan is still running: si aggiorna il Model, uno scan avviato dopo la raccolta non trattiene il Run automatico.
