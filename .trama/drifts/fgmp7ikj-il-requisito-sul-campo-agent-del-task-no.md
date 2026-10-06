---
status: resolved
resolution: fix-code
refs:
  - requirements/data#task
proposal: 3oidepxv
task: ejq3bxbe
origin: k4lacjfd
option: 1
note: null
created: 2026-10-06T14:00:02.588Z
---
# Il Requisito sul campo agent del Task non prevede chi l'ha preso

## What happens

Quando l'agente prende un Task, il file del Task segna **chi l'ha preso**: il terminale dell'agente oppure `cursor` per la chat di Cursor; `true` solo se non si sa da chi. Così la fine di un terminale, o della chat, libera solo i Task presi da lì.

Il codice fa già quello che chiede il Modello e l'opzione scelta nel Drift 8bfntqzh; non c'è codice da correggere.

## What should happen

Il Requisito sui dati del Task dice ancora che `agent` vale **solo true o false**. L'opzione scelta per il Drift 8bfntqzh era cambiare il Requisito, non il codice, ma il Drift è stato chiuso come correzione del codice e il Requisito non è cambiato.

Scrivere solo `true` farebbe liberare tutti i Task presi alla fine di qualsiasi terminale, contro il Modello. La Proposal allegata cambia il Requisito come nell'opzione scelta.

## Fix options

### Approvare la Proposal che cambia il Requisito

Il Requisito sui dati del Task ammette, oltre a `false` e `true`, l'identità del terminale o `cursor`. Il codice e i file già scritti restano come sono; costa solo la revisione della Proposal.

### Tenere agent vero o falso e aggiungere un campo per chi l'ha preso

Il file torna a segnare `true` e chi l'ha preso va in un campo a parte, da aggiungere al Requisito con un'altra Proposal. Costa una modifica al codice e la lettura dei file già scritti con l'identità dentro `agent`, da capire e riscrivere.

## Where in the code

src/core/work.ts: agentField, saveItem, moveTask, releaseTasks
