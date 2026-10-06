---
status: resolved
resolution: fix-code
refs:
  - requirements/data#task
  - task/Taken by the agent
proposal: null
task: k4lacjfd
origin: null
option: 1
note: null
created: 2026-10-06T13:56:01.329Z
---
# Il campo agent di un Task contiene chi l'ha preso invece di true

## What happens

Quando l'agente prende un Task, il file del Task non segna `agent: true`: scrive al suo posto **chi l'ha preso**, cioè l'identità del terminale dell'agente oppure `cursor` per la chat di Cursor. Il valore torna `false` quando il Task è rilasciato o ripreso dal developer.

Così Trama sa quale terminale, o la chat, deve liberare il Task alla fine del comando. Un Task preso senza terminale né chat noti resta `true`.

## What should happen

Il Requisito sui dati del Task dice che `agent` vale **true mentre l'agente ha preso il Task e false altrimenti**, e non prevede altri valori né un altro campo per chi l'ha preso.

Il Modello però chiede che la fine di un terminale liberi solo i Task presi da quel terminale, e che la chat di Cursor liberi solo i suoi: per farlo serve ricordare chi ha preso il Task.

## Fix options

### Dire nel Requisito che agent può nominare chi ha preso il Task

Il codice resta com'è; il Requisito sui dati del Task cambia: `agent` vale `false`, `true` (preso senza sapere da chi) oppure l'identità del terminale o `cursor`. Costa solo una modifica al Requisito con una Proposal; i file già scritti restano validi.

### Tenere agent vero o falso e aggiungere un campo per chi l'ha preso

Il file torna a segnare `agent: true` e chi l'ha preso va in un campo a parte, aggiunto al Requisito. Serve comunque una Proposal per il nuovo campo, più la lettura dei file già scritti con l'identità dentro `agent`, che vanno capiti e riscritti.

### Scrivere solo true e non ricordare chi ha preso il Task

Il file segue alla lettera il Requisito, ma Trama non sa più quale terminale ha preso un Task: la fine di qualsiasi terminale, o della chat, libererebbe tutti i Task presi, contro quanto il Modello dice per i worktree e per la chat. Sconsigliato.

## Where in the code

`src/core/work.ts`: `agentField`, `saveItem`, `moveTask`, `releaseTasks`
