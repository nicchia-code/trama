---
status: resolved
resolution: fix-code
refs:
  - panel/Settings
proposal: null
task: s7ipoalm
origin: null
critical: false
option: 1
note: null
resolvedBy: gok5pjjs
created: 2026-10-17T06:35:06.134Z
---
# Suggerimenti di Cursor: l'etichetta è il nome interno del modello

## What happens

Nella scheda Settings, l'elenco dei modelli suggeriti per la chat di Cursor mostra il nome interno del modello (per esempio claude-opus-5-5) come etichetta, invece del nome leggibile che Cursor usa per il modello (per esempio Claude Opus 5.5).

## What should happen

Per ogni modello suggerito di Cursor la scheda deve mostrare come etichetta il nome leggibile del modello, mentre il valore salvato resta il nome interno.

## Fix options

### leggi-nome-leggibile

Leggere il nome leggibile del modello dalla voce di Cursor e usarlo come etichetta, con il nome interno come valore.

### etichetta-uguale-al-valore

Accettare che l'etichetta sia il nome interno, e aggiornare i requisiti a questo comportamento.

## Where in the code

extension/src/host/model-lists.ts, funzione parseCursorModels, riga 63
