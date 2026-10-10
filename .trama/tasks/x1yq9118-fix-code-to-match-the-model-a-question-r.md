---
column: done
technical: false
refs:
  - panel/Closed/question-round.ROUND_OPENED
drift: hak11eb1
proposal: null
agent: false
created: 2026-10-09T21:50:06.491Z
finished: 2026-10-09T21:56:41.485Z
---
# Fix code to match the Model: A question round without a Trama project does not open the panel

## What happens

Quando l'agente chiede domande e il progetto Trama non c'è più nello spazio di lavoro, il pannello non si apre: il round resta in attesa dell'agente e nell'editor non compare nulla che lo mostri o che indichi come rispondere.

## What should happen

Il Model dice che il round di domande apre sempre il pannello, da Chiuso, in primo piano sul Diagramma, con il round sopra. Non prevede il caso in cui non ci sia un progetto da mostrare.

## Chosen option

**Rispondere subito che il round non è disponibile**

Il round viene chiuso senza risposta e l'agente riceve subito l'esito che Trama non è disponibile, così non aspetta all'infinito. Il developer non vede nulla nel pannello e deve ripetere la domanda quando il progetto torna. Costa una risposta negativa in più da gestire nell'agente.

## Where in the code

extension/src/host/controller.ts (revealForQuestions); extension/src/host/question-session.ts (present, reveal)
