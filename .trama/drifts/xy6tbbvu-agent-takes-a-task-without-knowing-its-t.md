---
status: resolved
resolution: proposal
refs:
  - task/To do/agent.MOVE_TASK_TO_DOING
  - task/Taken by the agent/terminal.COMMAND_ENDED
  - requirements/rules#task
proposal: null
task: null
origin: null
option: null
note: null
resolvedBy: i0e2coiq
created: 2026-10-10T08:49:02.973Z
---
# Agent takes a Task without knowing its terminal

## What happens

Quando il comando dell'agente sposta un Task in corso senza sapere da quale terminale arriva, il Task viene preso lo stesso e nessun terminale lo tiene. La fine del comando di un qualsiasi terminale dell'agente lo rilascia, anche se è un altro terminale.

## What should happen

Il Modello dice che il Task è preso solo dal terminale dell'agente che lo ha spostato: uno spostamento fatto fuori da quel terminale non lo prende, come non lo prende quello del developer. La fine del comando di un altro terminale non rilascia nulla.

## Fix options

### Non prendere il Task senza terminale

Lo spostamento fatto senza terminale riconosciuto non prende il Task, come quello del developer. Il Task resta libero e rilasciarlo non tocca nessun altro terminale. Costo: l'agente senza terminale non può tenere il Task.

### Rifiutare lo spostamento senza terminale

Lo spostamento dell'agente senza terminale riconosciuto viene rifiutato con un messaggio. L'agente deve lavorare dal proprio terminale. Costo: l'agente fuori dal terminale non può più spostare i Task.

## Where in the code

src/core/work.ts (moveTask, releaseTasks); extension/src/host/agent.ts (releaseTakenTasks)
