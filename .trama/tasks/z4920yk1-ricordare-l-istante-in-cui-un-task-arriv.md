---
column: done
technical: false
refs:
  - task/Done
  - task/To do/developer.MOVE_TASK_TO_DONE
  - task/To do/agent.MOVE_TASK_TO_DONE
  - task/In progress/agent.MOVE_TASK_TO_DONE
  - task/Free/developer.MOVE_TASK_TO_DONE
  - requirements/data#task
drift: null
proposal: 94bb2yjg
agent: false
created: 2026-10-06T12:17:25.122Z
---
# Ricordare l'istante in cui un Task arriva in Done

Quando un Task arriva in Done da un'altra colonna, da qualunque mossa (developer o agente, To do, In progress libero o preso), ricorda l'istante di arrivo in UTC, ISO 8601, nel campo `finished`. Uno spostamento da Done a Done non lo cambia; ogni spostamento fuori da Done lo toglie, e un nuovo arrivo in Done ne scrive uno nuovo. I Task arrivati in Done prima di questo campo restano senza `finished` e si leggono come prima. Il campo arriva anche al pannello con i dati dei Task.
