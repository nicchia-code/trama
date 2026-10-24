---
status: approved
requires:
  - 8vuvkoxz
base:
  requirements/rules/project.md: 264f33a7487df38abf25f78e4e3a853a194d26b7a0d3aebc8ac616133871d457
  requirements/tech/models.md: b57ed67bca70832870e09c708d62fa809a143186eefc8e5a1806c9eba21b3a4e
  requirements/rules/models.md: 363229fcbfc5a5c5927f01d95ffca56f5aad623f9b12f1ee8848d1059beaeeac
  requirements/tech/work.md: 752dd740f06da0063d6e4e8ca57e9e3bb8f2272fbc46d9ab66a7fb05b8bab9cc
  requirements/tech/sotto-agenti.md: new
delete: []
created: 2026-10-24T07:58:29.705Z
label: Sotto-agente Task
---
# Sotto-agente di implement

Oggi ogni sotto-agente che realizza un Task legge l'intera skill `trama-implement` (43 KB, circa 11 mila token) per usarne solo i passi 2-5: nel Run da 47 Task di ottobre queste letture erano il 21% di tutto ciò che i sotto-agenti leggevano. Un sotto-agente di omp dedicato, installato da Trama come `trama-analysis`, porta i soli passi di un Task nel suo prompt, che omp tiene in cache fra i sotto-agenti: niente lettura della skill, meno token e un avvio più rapido.

## Decisioni

- I sotto-agenti che realizzano i Task sono un sotto-agente di omp dedicato, `trama-implementer`, con la sua definizione in `.omp/agents/` installata e aggiornata da Trama come `trama-analysis`; le istruzioni di un Task stanno nel suo prompt.

## Assunzioni da verificare

- Il sotto-agente non ha un modello proprio: usa il modello della corsa che lo avvia, così il modello di una Proposal e `trama.execution` valgono anche per lui. Va verificato con omp 18.12 che una definizione senza `model` erediti il modello del processo principale.
- Le regole lunghe e rare (come archiviare un Drift e come scriverlo) restano nella skill: il sotto-agente legge solo quelle sezioni, e solo quando deve archiviare un Drift.
- Il prompt resta in inglese e sotto i 6 KB.
- Un agente senza la definizione installata (per esempio un progetto non aggiornato) usa i propri sotto-agenti con le istruzioni di oggi: la skill lo dice.
