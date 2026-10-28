---
technical: false
refs:
  - task
---
# Task di correzione per differenze

Un Task di correzione può venire da una differenza di un Drift unificato, oppure da più differenze collegate decise insieme nella stessa risoluzione. Fatto il lavoro, vale quanto segue.

- La verifica del Task copre ciascuna delle differenze che corregge, ognuna con i suoi due lati, dove nel codice, l'opzione scelta e la nota.
- `agent.CLOSE_TASK_UNCHANGED` (e `developer.CLOSE_TASK_UNCHANGED`, solo dalla riga di comando, con le stesse condizioni e conseguenze) su un tale Task è accettato, con una nota, solo se quelle differenze sono ancora corrette nel codice da questo Task (`decision: fix-code` con `task` uguale al Task), oppure già chiuse da questo stesso Task; altrimenti non cambia nulla e il rifiuto dice perché. Chiuderlo trova le differenze il cui `task` è questo Task e mette loro `decision: dismissed`, tenendo `task`, `option`, `note` e `resolvedBy` com'erano dopo la scelta di correggere il codice: contano come chiuse senza modifiche, ricordando la scelta fatta prima, qualunque sia lo stato del Drift unificato. Il Drift unificato non cambia stato (resta Open o Differences decided); `CLOSED_UNCHANGED` per un Task di differenze chiude solo quelle differenze. Il Task è Done e sblocca le sue origini come ogni Task chiuso senza modifiche.
- Un Task non si cancella (dai dettagli in To do né con Clear) finché è il Task di correzione di una differenza di un Drift unificato ancora corretta nel codice da esso e non Done, né mentre è l'origine di una differenza aperta: i controlli di cancellazione e di Clear guardano il `task` delle differenze aperte e decise e le origini delle differenze aperte.
