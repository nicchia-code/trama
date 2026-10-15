---
column: done
technical: false
refs:
  - question-round/Queued
  - requirements/rules#question-round
drift: scmundi6
proposal: null
agent: false
created: 2026-10-14T12:38:57.531Z
finished: 2026-10-14T12:44:00.567Z
---
# Fix code to match the Model: A window that gets its project back again shows two rounds at once and orphans the first

## What happens

Se il progetto scompare dalla finestra mentre un round è in corso e poi torna nella stessa finestra, la finestra crea un servizio nuovo senza attendere il round precedente. Il nuovo round si presenta subito sopra il vecchio: le risposte date al primo vanno perse, e l'agente che lo aspettava resta in attesa senza che il developer possa più rispondergli.

## What should happen

Il Modello dice che una finestra presenta al massimo un round alla volta: un round che arriva mentre un altro è aperto aspetta in coda, e il round in corso resta l'unico visibile finché non finisce o viene interrotto. Nessuna risposta deve perdersi, e nessun agente deve restare in attesa di un round che nessuno può più vedere.

## Chosen option

**Keep the round in progress and queue the new one**

Quando il progetto torna, la finestra accoda i round nuovi dietro quello ancora in corso, finché questo finisce o viene interrotto. Il developer risponde prima al round vecchio e poi al nuovo, e nessuna risposta si perde. Costo: il round nuovo attende anche quando il progetto è già tornato, e la finestra deve tenere un solo ordine di coda.

## Where in the code

extension/src/host/questions.ts (EditorQuestions.ensure, detachService: un servizio nuovo accanto a quello ritirato); extension/src/host/question-session.ts (present sostituisce il round attivo)
