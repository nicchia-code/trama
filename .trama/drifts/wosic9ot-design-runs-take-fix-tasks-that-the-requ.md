---
status: resolved
resolution: proposal
refs:
  - requirements/rules#task
proposal: null
task: null
origin: null
option: null
note: null
resolvedBy: y52ae3pw
created: 2026-10-09T22:21:13.712Z
---
# Design runs take fix Tasks that the Requirement says belong to no design

## What happens

Il **Task di correzione** di un Drift nato da un Task di un design viene legato a quel design, come dice il Model del Task. Di conseguenza **Run this design** e la corsa con `--proposal` lo considerano: compare nella scheda del design, conta per la sua colonna e viene realizzato dalla corsa del design, prima del Task che lo aspetta.

## What should happen

Il Requisito sulle corse dice che una corsa di un design considera solo i Task di quel design, **così un Task di correzione, che non appartiene ad alcun design, non viene mai realizzato da essa**. Il Model del Task invece dice che il Task di correzione appartiene al design del Task da cui è nato il Drift, anche se tecnico. Il codice segue il Model; il Requisito è rimasto alla regola precedente e le due fonti si contraddicono.

## Fix options

### Allineare il Requisito al Model

Si riscrive la frase del Requisito sulle corse: la corsa di un design considera i Task legati a quel design, compreso il Task di correzione di un Drift nato da uno di essi, che va prima del Task che lo aspetta. Il codice non cambia; serve solo una Proposal sui Requisiti.

### Escludere i Task di correzione dal design

Si torna alla regola del Requisito: il Task di correzione non si lega più al design dell'origine, esce dalla scheda del design e solo Run all To do lo realizza. Va però cambiato anche il Model del Task, che oggi dice il contrario, e il Task che aspetta resta bloccato in una corsa del design finché qualcuno non lancia Run all To do.

## Where in the code

src/core/work.ts (fixCode, newTask, nextTask); src/core/design.ts (placeTasks)
