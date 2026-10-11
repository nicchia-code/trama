---
column: done
technical: false
refs:
  - drift-resolution/Free
  - drift-resolution/Resolving
  - requirements/tech#drift-resolution
  - requirements/quality#drift-resolution
  - requirements/rules#drift-resolution
drift: null
proposal: null
agent: false
created: 2026-10-11T08:55:02.723Z
finished: 2026-10-11T09:02:23.844Z
---
# Forward send reservations and their outcome to the project coordinator

Ogni finestra deve inoltrare al coordinatore del progetto la prenotazione di un invio (Run, scan o risoluzione) prima dell'invio reale e il suo esito (partito o non partito), così che un invio manuale in una finestra e uno automatico nel coordinatore non partano insieme, e un invio non riuscito rilasci la prenotazione senza lasciare un lavoro fantasma. Oggi le finestre inoltrano solo l'inizio e la fine di un lavoro già partito, e i controlli prima dell'invio guardano soltanto i lavori già noti: la prenotazione protegge solo gli invii della stessa finestra. Deve essere vero a fine lavoro: prenotazione, ricontrollo e invio sono serializzati per progetto anche fra finestre diverse, e l'automatismo non concede un passo mentre un'altra finestra ha una prenotazione aperta. Un lavoro conta come in corso solo dall'invio reale, non dalla prenotazione.
