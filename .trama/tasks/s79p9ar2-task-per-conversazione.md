---
column: done
technical: false
refs:
  - task/Taken by the agent
  - requirements/rules#task/Taken by the agent
  - requirements/data#task
drift: null
proposal: n97kq4ls
agent: false
created: 2026-10-21T11:33:12.145Z
finished: 2026-10-21T11:37:52.132Z
---
# Task presi per conversazione

Un Task preso dall'agente della chat di Cursor, o da un suo sotto-agente, appartiene alla conversazione di Trama di quell'agente: il campo `agent` vale `cursor:<conversation>` (identità ricavata da `TRAMA_CHAT`), non più il solo `cursor` condiviso (`originFromEnv` in `src/core/announcements.ts`, `agentVariable` in `src/cli/main.ts`). Un Task preso dalla chat senza conversazione nota resta `cursor`, appartiene alla chat del progetto ed è rilasciato dalla fine di turno, dall'interruzione o dalla chiusura di qualunque conversazione di Trama del progetto, come oggi; un Task `true` è rilasciato anche da queste.

`editor-chat.AGENT_STOPPED` riporta in To do solo i Task presi da quella conversazione (sotto-agenti inclusi) e quelli della chat del progetto; i Task delle altre conversazioni, per esempio un altro Run lanciato con Submit While Running, restano presi (`releaseTakenTasks` in `extension/src/host/agent.ts`, `releaseTasks` in `src/core/work.ts`). Una fine di turno che Trama continua con la revisione finale dell'Advisor della chat non rilascia nulla.

La dichiarazione di avanzamento è accettata solo dalla stessa conversazione (sotto-agenti inclusi) per un Task `cursor:<conversation>`, dalla chat del progetto per un Task `cursor`, da qualunque agente per un Task `true`; ogni altra dichiarazione, anche da un'altra conversazione, non cambia nulla, stampa una nota col motivo ed esce con 0.
