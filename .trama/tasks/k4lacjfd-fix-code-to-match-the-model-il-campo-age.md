---
column: done
technical: false
refs:
  - requirements/data#task
  - task/Taken by the agent
drift: 8bfntqzh
proposal: null
agent: false
created: 2026-10-06T13:56:54.735Z
---
# Fix code to match the Model: Il campo agent di un Task contiene chi l'ha preso invece di true

## What happens

Quando l'agente prende un Task, il file del Task non segna `agent: true`: scrive al suo posto **chi l'ha preso**, cioè l'identità del terminale dell'agente oppure `cursor` per la chat di Cursor. Il valore torna `false` quando il Task è rilasciato o ripreso dal developer.

Così Trama sa quale terminale, o la chat, deve liberare il Task alla fine del comando. Un Task preso senza terminale né chat noti resta `true`.

## What should happen

Il Requisito sui dati del Task dice che `agent` vale **true mentre l'agente ha preso il Task e false altrimenti**, e non prevede altri valori né un altro campo per chi l'ha preso.

Il Modello però chiede che la fine di un terminale liberi solo i Task presi da quel terminale, e che la chat di Cursor liberi solo i suoi: per farlo serve ricordare chi ha preso il Task.

## Chosen option

**Dire nel Requisito che agent può nominare chi ha preso il Task**

Il codice resta com'è; il Requisito sui dati del Task cambia: `agent` vale `false`, `true` (preso senza sapere da chi) oppure l'identità del terminale o `cursor`. Costa solo una modifica al Requisito con una Proposal; i file già scritti restano validi.

## Where in the code

`src/core/work.ts`: `agentField`, `saveItem`, `moveTask`, `releaseTasks`
