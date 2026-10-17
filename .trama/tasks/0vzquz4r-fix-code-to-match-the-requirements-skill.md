---
column: done
technical: true
refs:
  - requirements/tech#drift-resolution
drift: mjt17y3l
proposal: null
agent: false
created: 2026-10-17T17:08:39.158Z
finished: 2026-10-17T18:09:05.786Z
---
# Fix code to match the Requirements: Skill descrivono impostazioni di delega inesistenti

## What happens

Le skill trama-implement, trama-resolve-drifts e trama-import dicono che la delega dei Drift è letta da trama.autoFixDrifts e trama.autoFixCriticalDrifts, due impostazioni booleane che non esistono più: la delega è un solo menu, trama.driftAutoPilot, con disabled, enabled e yolo. L'agente che legge queste istruzioni riceve una regola sbagliata sulla modalità.

## What should happen

La delega è trama.driftAutoPilot con i tre valori disabled, enabled e yolo, letta solo dalle impostazioni utente; le skill distribuite descrivono l'impostazione attuale e la rilettura con trama drift autopilot.

## Chosen option

**Aggiornare il nome e i valori nelle tre skill**

Sostituire in skills/trama-implement, skills/trama-resolve-drifts e skills/trama-import il riferimento alle due impostazioni con trama.driftAutoPilot e i tre valori disabled, enabled e yolo, lasciando invariato il resto della regola.

## Where in the code

skills/trama-resolve-drifts/SKILL.md:81 (sezione Autopilot limits); skills/trama-implement/SKILL.md:110; skills/trama-import/SKILL.md:95 (stesso riferimento a trama.autoFixDrifts)
