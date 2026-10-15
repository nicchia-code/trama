---
column: done
technical: false
refs:
  - question-round/Not asked/agent.ASK_QUESTIONS
  - requirements/data#question-round
drift: yr2wla8w
proposal: null
agent: false
created: 2026-10-14T12:38:57.522Z
finished: 2026-10-14T12:41:02.621Z
---
# Fix code to match the Model: A round asked for a project whose window still holds a round is reported as interrupted, not unavailable

## What happens

Se la cartella del progetto Trama viene tolta mentre la finestra resta aperta e un round è ancora in corso, una nuova richiesta dell'agente per lo stesso progetto non viene servita come editor non disponibile. L'agente riceve l'errore di editor perso, cioè la stessa risposta che dà quando l'editor viene chiuso durante un round già accettato, e si ferma invece di usare le proprie domande.

## What should happen

Il Modello dice che una richiesta a cui nessun editor risponde per il progetto ottiene l'indisponibilità iniziale, così l'agente può usare le proprie domande. L'interruzione è riservata alla perdita dell'editor dopo che il round è stato accettato. Il progetto che scompare dalla finestra non è una perdita dell'editor: il round in corso continua, e la richiesta nuova deve ricevere la stessa indisponibilità iniziale di quando il progetto non c'è affatto.

## Chosen option

**Answer the new request as unavailable**

La richiesta nuova riceve l'indisponibilità iniziale, come quando il progetto non è aperto in nessuna finestra. L'agente può usare le sue domande e non si ferma. Il round in corso continua a essere servito. Costo: nessuno di rilevante; il caso riguarda solo una cartella tolta mentre un round è aperto.

## Where in the code

src/core/question-channel.ts (la risposta dell'handler convertita in errore di editor perso dopo l'hello); extension/src/host/questions.ts (handler: servizio detached)
