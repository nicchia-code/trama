---
status: resolved
resolution: proposal
refs:
  - work
proposal: null
task: null
origin: null
critical: false
option: null
note: null
resolvedBy: 7pbe7l7n
created: 2026-10-17T12:19:13.887Z
---
# La Feature work descrive ancora lo smistamento delle Machine

## What happens

La descrizione della Feature work dice che ogni scansione smista prima le Machine con il classificatore System 1 e analizza solo quelle in conflitto. Il codice della scansione confronta invece ogni Machine direttamente, senza smistamento.

## What should happen

Il Requisito rules#work dice che ogni Machine dell'ambito va confrontata direttamente con il codice, senza smistamento né classificatore. Il Modello e il Requisito si contraddicono, quindi il codice non può rispettarli entrambi: va aggiornata la descrizione del Modello.

## Where in the code

skills/trama-scan/SKILL.md (già conforme al Requisito); .trama/model/work/feature.md (la frase sullo smistamento)
