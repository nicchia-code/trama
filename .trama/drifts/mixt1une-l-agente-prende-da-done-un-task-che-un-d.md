---
status: open
resolution: null
refs:
  - task/Done/agent.MOVE_TASK_TO_DOING
  - requirements/rules#task
proposal: null
task: null
origin: null
option: null
note: null
created: 2026-10-06T21:08:04.309Z
---
# L'agente prende da Done un Task che un Drift aperto bloccherebbe

## What happens

Quando l'agente sposta in In progress un Task che è in **Done**, il Sistema non controlla se il Task è bloccato: poiché un Task Done non è mai bloccato, lo spostamento riesce sempre.

Così un Task che riguarda la stessa cosa di un Drift aperto (o che aspetta il Task di correzione del suo Drift) finisce **preso dall'agente** e subito segnato come bloccato, per esempio "(agent working) (blocked by Drift D1)".

## What should happen

Dal Done, `agent.MOVE_TASK_TO_DOING` porta a Taken by the agent **solo se il Task non è bloccato, come in To do**; un Task bloccato non può essere preso dall'agente, qualunque sia la sua colonna. Se il Task, uscendo da Done, sarebbe bloccato, lo spostamento va rifiutato, non cambia nulla e il rifiuto nomina il Drift (o il Task di correzione) che lo blocca.

## Fix options

### Rifiutare come da To do

Prima di uno spostamento dell'agente in In progress da Done, il Sistema valuta il blocco come se il Task non fosse più Done: se un Drift aperto o un Task di correzione lo bloccherebbe, rifiuta e nomina chi blocca, come già fa da To do. Costa un piccolo cambio alla presa e un test; gli spostamenti del developer restano liberi.

### Rifiutare solo per i Drift aperti

Il rifiuto da Done vale solo quando un Drift aperto riguarda il Task; l'attesa del Task di correzione non conta, perché un Task di origine in Done non aspetta nulla. Più semplice da spiegare, ma lascia un caso in cui l'agente prende un Task che poi risulta in attesa.

## Where in the code

src/core/work.ts, moveTask (il controllo usa blockedTasks, che esclude i Task in Done); src/core/blocking.ts, computeBlocked
