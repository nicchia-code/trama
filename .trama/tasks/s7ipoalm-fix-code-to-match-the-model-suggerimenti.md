---
column: done
technical: false
refs:
  - panel/Settings
drift: izdw5y7g
proposal: null
agent: false
created: 2026-10-17T06:42:19.271Z
finished: 2026-10-17T06:59:07.998Z
---
# Fix code to match the Model: Suggerimenti di Cursor: l'etichetta è il nome interno del modello

## What happens

Nella scheda Settings, l'elenco dei modelli suggeriti per la chat di Cursor mostra il nome interno del modello (per esempio claude-opus-5-5) come etichetta, invece del nome leggibile che Cursor usa per il modello (per esempio Claude Opus 5.5).

## What should happen

Per ogni modello suggerito di Cursor la scheda deve mostrare come etichetta il nome leggibile del modello, mentre il valore salvato resta il nome interno.

## Chosen option

**leggi-nome-leggibile**

Leggere il nome leggibile del modello dalla voce di Cursor e usarlo come etichetta, con il nome interno come valore.

## Where in the code

extension/src/host/model-lists.ts, funzione parseCursorModels, riga 63
