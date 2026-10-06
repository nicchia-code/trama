---
column: done
technical: true
refs:
  - requirements/data#task
drift: fgmp7ikj
proposal: null
agent: false
created: 2026-10-06T14:03:15.672Z
---
# Fix code to match the Requirements: Il Requisito sul campo agent del Task non prevede chi l'ha preso

## What happens

Quando l'agente prende un Task, il file del Task segna **chi l'ha preso**: il terminale dell'agente oppure `cursor` per la chat di Cursor; `true` solo se non si sa da chi. Così la fine di un terminale, o della chat, libera solo i Task presi da lì.

Il codice fa già quello che chiede il Modello e l'opzione scelta nel Drift 8bfntqzh; non c'è codice da correggere.

## What should happen

Il Requisito sui dati del Task dice ancora che `agent` vale **solo true o false**. L'opzione scelta per il Drift 8bfntqzh era cambiare il Requisito, non il codice, ma il Drift è stato chiuso come correzione del codice e il Requisito non è cambiato.

Scrivere solo `true` farebbe liberare tutti i Task presi alla fine di qualsiasi terminale, contro il Modello. La Proposal allegata cambia il Requisito come nell'opzione scelta.

## Chosen option

**Approvare la Proposal che cambia il Requisito**

Il Requisito sui dati del Task ammette, oltre a `false` e `true`, l'identità del terminale o `cursor`. Il codice e i file già scritti restano come sono; costa solo la revisione della Proposal.

## Where in the code

src/core/work.ts: agentField, saveItem, moveTask, releaseTasks
