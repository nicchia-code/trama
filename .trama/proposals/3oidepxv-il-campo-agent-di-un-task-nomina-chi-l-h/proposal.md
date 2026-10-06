---
status: approved
base:
  requirements/data/work.md: 686ead33056ab7af49ff3e2eec927bbbeac10fcbfe1479dd5bcd8577c40264a1
delete: []
created: 2026-10-06T13:59:37.489Z
scanScope:
  - ref: requirements/data#task
    reason: changed
---
# Il campo agent di un Task nomina chi l'ha preso

Il Modello chiede che la fine di un terminale dell'agente liberi solo i Task presi da quel terminale, e che la chat di Cursor liberi solo i suoi: Trama deve quindi ricordare chi ha preso un Task. Il codice lo fa già scrivendo chi l'ha preso nel campo `agent` del Task, ma il Requisito sui dati del Task ammette solo true o false.

Scelte fatte senza intervista (da controllare):
- Si segue l'opzione scelta nel Drift 8bfntqzh: il codice resta com'è e cambia solo il Requisito `data#task`.
- `agent` vale `false` (libero), oppure l'identità del terminale dell'agente che l'ha preso, oppure `cursor` per la chat di Cursor, oppure `true` quando è stato preso senza sapere da chi.
- Un Task con `agent: true` è liberato dalla fine di qualsiasi terminale o della chat; i file già scritti con `true` o `false` restano validi.
