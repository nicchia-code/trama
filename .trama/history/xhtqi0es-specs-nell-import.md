---
created: 2026-10-20T21:52:19.999Z
updated: 2026-10-20T21:52:19.999Z
summary: La skill trama-import scrive le Specs (specs.yaml) nella prima Proposal, deducendole dai file del repository, senza chosenByAgent e con la sola versione principale; le Specs già presenti si aggiornano.
tasks:
  - vksri2bl
---
# Specs nell'import

La skill `trama-import` descrive le tecnologie del codice nelle Specs, come `trama-setup`, ma deducendole da manifest, lockfile, configurazioni di test e CI, Dockerfile e file di infrastruttura. La prima Proposal scrive `specs.yaml`; i requisiti `tech` non elencano più linguaggi, framework e librerie. Le Specs già presenti sono aggiornate, le voci non più usate finiscono fra i `## Doubts`, e il resoconto dice se le Specs sono state scritte o aggiornate. La documentazione in `docs/` descrive il comportamento.
