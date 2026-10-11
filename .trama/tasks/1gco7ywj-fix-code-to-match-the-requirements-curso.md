---
column: done
technical: true
refs:
  - requirements/tech#editor-chat
drift: ldhhsi95
proposal: iyil1j92
agent: false
created: 2026-10-11T17:36:50.548Z
finished: 2026-10-11T18:03:08.709Z
---
# Fix code to match the Requirements: Cursor hook form on Windows is not specified

## What happens

Il Task chiede che il file degli hook di Cursor (`hooks.json`) contenga, su Windows, la forma del comando che la shell degli hook di Cursor accetta. I Requisiti dicono che questa forma è «quella provata per Cursor», ma non la scrivono da nessuna parte: non c'è né il comando né la versione di Cursor con cui è stata provata. Non posso provarla qui, perché l'ambiente di lavoro è Linux e non c'è Cursor su Windows. Per Copilot invece la forma è scritta nei Requisiti e può essere implementata senza dubbi.

## What should happen

I Requisiti dicono che la forma di Cursor è stata provata a mano su Windows e che va riportata al developer con un Drift sui Requisiti, ma non indicano quale sia. Senza la forma, il file di Cursor su Windows potrebbe non far partire gli hook: non posso scegliere un comando non provato. Chi decide deve indicare la forma e la versione di Cursor provate, perché i Requisiti la scrivano.

## Chosen option

**Indicare la forma provata per Cursor**

Il developer riporta il comando che Cursor accetta su Windows e la versione di Cursor con cui è stato provato. Scrivo quella forma in `hooks.json` su Windows, e i Requisiti in `tech#editor-chat` la riportano insieme alla versione provata. Costo: serve una prova manuale su Windows con Cursor prima di chiudere il Task.
