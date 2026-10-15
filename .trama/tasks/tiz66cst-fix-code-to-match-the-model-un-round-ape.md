---
column: done
technical: false
refs:
  - question-round/Asking
  - requirements/rules#question-round
drift: ci10zl3w
proposal: null
agent: false
created: 2026-10-14T12:55:55.936Z
finished: 2026-10-14T13:01:33.515Z
---
# Fix code to match the Model: Un round aperto resta sopra il pannello quando la finestra passa a un altro progetto

## What happens

Con un round di domande in corso, se il developer toglie dallo spazio di lavoro la cartella del progetto e la finestra passa a un altro progetto Trama, il round del primo progetto resta sopra il pannello del secondo. Il developer vede così le domande di un progetto mentre il pannello mostra l'altro. Le risposte vanno comunque all'agente che le aspetta.

## What should happen

Il Requisito dice che una finestra non mostra mai le domande di un progetto in una finestra per un progetto diverso, e che ogni round va alla finestra dello stesso progetto. Il Modello dice che una finestra presenta al massimo un round alla volta. La decisione già presa sulla scomparsa del progetto (il round resta finché la finestra è aperta) non dice cosa succede quando la finestra passa a un altro progetto.

## Chosen option

**Tenere il round in coda finché torna il suo progetto**

Il round del primo progetto non viene mostrato al secondo: la finestra lo tiene in coda, con i round nuovi dietro, finché la finestra non torna al primo progetto o il round finisce. Il secondo progetto riceve solo i propri round. Costo: l'agente può aspettare a lungo senza che il developer risponda, e la finestra deve ricordare quale progetto ha un round in sospeso.

## Where in the code

`extension/src/host/questions.ts`: `EditorQuestions.ensure` e `detachService`: passando a un altro progetto, il servizio del primo resta per il round in corso. `extension/src/host/question-session.ts`: il round viene mostrato sopra il pannello del nuovo progetto.
