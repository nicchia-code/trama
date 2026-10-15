---
status: resolved
resolution: fix-code
refs:
  - question-round/Queued
  - requirements/rules#question-round
proposal: null
task: qornoga9
origin: null
critical: false
option: 1
note: null
resolvedBy: zg1i0cej
created: 2026-10-14T12:35:39.511Z
---
# A window that gets its project back again shows two rounds at once and orphans the first

## What happens

Se il progetto scompare dalla finestra mentre un round è in corso e poi torna nella stessa finestra, la finestra crea un servizio nuovo senza attendere il round precedente. Il nuovo round si presenta subito sopra il vecchio: le risposte date al primo vanno perse, e l'agente che lo aspettava resta in attesa senza che il developer possa più rispondergli.

## What should happen

Il Modello dice che una finestra presenta al massimo un round alla volta: un round che arriva mentre un altro è aperto aspetta in coda, e il round in corso resta l'unico visibile finché non finisce o viene interrotto. Nessuna risposta deve perdersi, e nessun agente deve restare in attesa di un round che nessuno può più vedere.

## Fix options

### Keep the round in progress and queue the new one

Quando il progetto torna, la finestra accoda i round nuovi dietro quello ancora in corso, finché questo finisce o viene interrotto. Il developer risponde prima al round vecchio e poi al nuovo, e nessuna risposta si perde. Costo: il round nuovo attende anche quando il progetto è già tornato, e la finestra deve tenere un solo ordine di coda.

### Resume the earlier service when the project returns

Quando il progetto torna nella stessa finestra, la finestra riprende il servizio che aveva, con la sua coda e il suo round in corso, invece di crearne uno nuovo. Costo: va mantenuto il collegamento tra il servizio precedente e il progetto che torna, e va gestito il caso in cui il progetto cambia davvero.

## Where in the code

extension/src/host/questions.ts (EditorQuestions.ensure, detachService: un servizio nuovo accanto a quello ritirato); extension/src/host/question-session.ts (present sostituisce il round attivo)
