---
column: done
technical: false
refs:
  - drift-resolution/Free
  - drift-resolution/Free/developer.ASK_AGENT
  - drift-resolution/Running tasks
  - drift-resolution/Resolving
  - requirements/rules#drift-resolution
  - requirements/data#drift-resolution
drift: null
proposal: hlnh5d44
agent: false
created: 2026-10-09T07:11:10.795Z
finished: 2026-10-09T08:23:39.942Z
---
# Launch Resolve Drifts and lock the runs while it works

Il developer può chiedere all'host di lanciare Resolve Drifts. L'host ricalcola al momento della richiesta i Drift aperti e la lancia solo se c'è almeno un Drift aperto, nessuna Proposal di risoluzione è ancora in scrittura o aperta (calcolato dalle Proposal con `kind: resolution` e `status` `draft` o `open`, mai tenuto in memoria) e la finestra è in Free. Altrimenti non invia nulla e avvisa il developer del motivo, come per Run all To do.

- Il testo dell'istruzione, il terminale `Drifts`, il modello e l'annuncio della Proposal al lancio sono fuori da questo Task: qui conta solo che i Drift coperti sono quelli aperti al momento dell'invio (quelli archiviati dopo restano per la volta seguente) e che Resolve Drifts lancia sempre un solo agente.
- Solo quando l'istruzione è davvero inviata la finestra passa in Resolving.
- In Resolving l'host rifiuta Run all To do, il Run di un Task e Run this design, dicendo che una risoluzione dei Drift è in corso; scansioni, design e import partono come sempre. In Running tasks rifiuta Resolve Drifts dicendo che un Run è in corso.
- Alla fine di Resolving i Run tornano liberi; Resolve Drifts torna disponibile solo se l'agente non ha consegnato una Proposal di risoluzione, altrimenti resta bloccato finché quella non è decisa.

Fatto quando ogni richiesta che non passa questi controlli non invia nulla e dice perché, anche se arriva dal pannello con il pulsante abilitato.
