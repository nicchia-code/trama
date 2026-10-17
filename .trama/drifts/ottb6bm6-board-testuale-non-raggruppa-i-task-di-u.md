---
status: resolved
resolution: fix-code
refs:
  - requirements/ui#task
proposal: null
task: o4oowmp5
origin: null
critical: false
option: 1
note: null
resolvedBy: ahuxjrwp
created: 2026-10-16T10:11:29.542Z
---
# Board testuale non raggruppa i Task di un design

## What happens

Nel testo di `trama board` ogni Task compare come riga singola nella sua colonna, come se fosse da solo. I Task nati dalla stessa Proposal non stanno insieme sotto un'unica voce, e la Proposal non compare nemmeno sulla riga del Task.

## What should happen

Ogni design compare una sola volta, nella colonna che i suoi Task formano insieme, con identità e titolo della Proposal e sotto i suoi Task, ciascuno con la propria colonna. Un design di un solo Task, e i Task senza design, restano come prima.

## Fix options

### Raggruppare i design nel testo della Board

Il testo di `trama board` mostra ogni design con più Task come un gruppo nella colonna derivata dai suoi Task, con identità e titolo della Proposal, e i Task sotto con la loro colonna. Il comando cambia forma: chi lo legge deve cercare i Task dentro i design. `trama task list` resta piatto.

### Usare una sola logica di raggruppamento per testo ed editor

Il raggruppamento dei design viene calcolato in un solo punto del core, usato sia dal testo della Board sia dalla Board dell'editor, così le due viste non possono divergere. Costo: il lavoro è più ampio e tocca anche la Board dell'editor, il cui risultato va verificato prima e dopo.

## Where in the code

src/cli/work.ts: boardView, dove le colonne To do, In progress e Done elencano i Task di ciascuna colonna in una riga piatta (entries e line); la riga non riporta la Proposal del Task.
