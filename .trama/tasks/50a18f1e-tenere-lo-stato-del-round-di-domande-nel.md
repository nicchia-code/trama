---
column: done
technical: false
refs:
  - question-round/Asking
  - question-round/In view
  - question-round/On question
  - question-round/Reviewing
  - question-round/Confirming skip all
  - question-round/On question/developer.CHOOSE_ANSWER
  - question-round/On question/developer.SKIP_QUESTION
  - question-round/On question/developer.GO_BACK
  - question-round/On question/developer.OPEN_QUESTION
  - question-round/On question/developer.OPEN_SUMMARY
  - question-round/Reviewing/developer.OPEN_QUESTION
  - question-round/Reviewing/developer.SEND_ANSWERS
  - question-round/In view/developer.CLOSE_QUESTIONS
  - question-round/Confirming skip all/developer.SKIP_ALL_QUESTIONS
  - question-round/Confirming skip all/developer.GO_BACK
  - question-round/Answered
  - requirements/data#question-round
  - requirements/rules#question-round
  - requirements/tech#question-round
drift: null
proposal: a19cef66
agent: false
created: 1970-01-01T00:00:00.156Z
---
# Tenere lo stato del round di domande nell'host e farlo avanzare con le azioni del developer

Il round che il developer sta rispondendo vive nell'host dell'editor, che lo fa avanzare a ogni azione del developer e lo consegna all'agente solo quando il Model lo permette.

Fatto quando:
- per ogni domanda l'host tiene la risposta confermata o il salto e, separatamente, quello che è scelto o scritto senza conferma; tiene anche la domanda corrente, se è stata aperta dal riepilogo, se il riepilogo è mostrato e se la conferma di Skip all è aperta (e da dove);
- alla prima visita l'opzione raccomandata è già scelta; le visite successive ritrovano quello che il developer aveva lasciato; nella scelta singola si può togliere la scelta e rispondere solo con il testo;
- Next/Review conferma con almeno una scelta o un testo non vuoto e va alla domanda successiva oppure al riepilogo (ultima domanda o domanda aperta dal riepilogo); confermare di nuovo sostituisce la risposta senza duplicarla;
- Skip salta solo la domanda corrente, senza conferma, e segue la stessa regola per la destinazione; Back e la scelta di una domanda dall'indice o dal riepilogo non confermano quello che c'è sulla domanda corrente;
- chiudere l'overlay o Skip all apre la conferma; Go back torna dove era senza cambiare nulla; Skip all confermato salta ogni domanda senza risposta confermata, tiene le confermate e consegna subito, senza riepilogo;
- Send consegna solo quando ogni domanda è risposta o saltata, e l'host rifiuta un invio incompleto anche se arriva dal pannello;
- all'agente arrivano solo le risposte confermate e i salti; il testo fatto solo di spazi non è consegnato;
- la logica è una parte senza dipendenze dall'editor, provata da test, e nulla del round è scritto su disco.
