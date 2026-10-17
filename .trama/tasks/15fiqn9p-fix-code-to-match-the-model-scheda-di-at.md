---
column: done
technical: false
refs:
  - panel/Board
drift: kr05liot
proposal: null
agent: false
created: 2026-10-17T12:11:32.332Z
finished: 2026-10-17T13:53:09.705Z
---
# Fix code to match the Model: Scheda di attesa senza pallino di stato e nome accessibile diverso

## What happens

La scheda di attesa mostra l'intestazione `Waiting for` senza il pallino di stato del Task di correzione, e il suo nome accessibile è `Waiting for T4: <titolo>` con i due punti.

## What should happen

Il Requisito di panel/Board chiede il titolo `Waiting for <numero breve> <titolo>` preceduto dal pallino di stato di quel Task.

## Chosen option

**Aggiungere il pallino allo header**

Mettere il pallino di stato del Task di correzione in testa alla scheda, e togliere i due punti dal nome accessibile.

## Where in the code

extension/src/webview/board/render.ts:370-371
