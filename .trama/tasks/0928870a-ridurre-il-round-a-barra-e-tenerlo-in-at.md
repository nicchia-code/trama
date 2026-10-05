---
column: done
technical: false
refs:
  - question-round/Out of sight
  - question-round/In view/developer.MINIMIZE_QUESTIONS
  - question-round/In view/developer.CLOSE_PANEL
  - question-round/Out of sight/developer.RESTORE_QUESTIONS
  - question-round/Out of sight/developer.OPEN_PANEL
  - question-round/Out of sight/developer.CLOSE_PANEL
  - panel/Open/developer.CLOSE_PANEL
  - requirements/ui#question-round
  - requirements/rules#question-round
  - requirements/tech#question-round
drift: null
proposal: a19cef66
agent: false
created: 1970-01-01T00:00:00.158Z
---
# Ridurre il round a barra e tenerlo in attesa quando il pannello si chiude, con Reopen

Il developer può togliere di mezzo le domande senza chiudere il round, e l'agente continua ad aspettare.

Fatto quando:
- Minimize riduce l'overlay a una barra in cima al pannello, sopra le schede, nel colore d'accento: `The agent is waiting for your answers (question <n> of <total>)` con il pulsante `Open questions`; il Diagramma, la Board e i Requisiti restano usabili;
- cliccare la barra o il pulsante riapre l'overlay sulla domanda o sul riepilogo che mostrava, con tutto quello che c'era;
- chiudere il pannello, con l'overlay aperto o ridotto, non chiude il round: compare il messaggio `Trama has questions from the agent waiting.` con il pulsante `Reopen`;
- `Reopen`, o riaprire il pannello in qualunque modo, riporta in primo piano il pannello con l'overlay aperto dove era;
- se nel frattempo il round è finito o l'agente ha smesso di aspettare, `Reopen` apre solo il pannello, senza nessun round;
- risposte, testo non confermato e posizione restano attraverso riduzione e chiusura del pannello.
