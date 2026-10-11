---
column: done
technical: false
refs:
  - drift-resolution/Free/developer.SET_DRIFT_AUTOPILOT
  - drift-resolution/In attesa delle scansioni
  - requirements/tech#drift-resolution
  - requirements/data#drift-resolution
  - requirements/quality#drift-resolution
drift: null
proposal: null
agent: false
created: 2026-10-11T10:36:34.787Z
finished: 2026-10-11T10:45:56.607Z
---
# Import the running jobs of the other windows when the autopilot leaves disabled

Con la delega `disabled` una finestra non annuncia più l'inizio dei propri Run, scan e risoluzioni alle altre finestre del progetto. Quando il developer passa da `disabled` a `enabled` o `yolo`, la finestra che coordina il progetto deve importare i lavori ancora in corso di tutte le finestre vive prima di rivalutare la barriera. Oggi l'importazione avviene soltanto quando una finestra acquisisce o riprende il ruolo di coordinatore: se la finestra già detiene il ruolo (per esempio perché aveva coordinato prima, o perché ha risposto a una richiesta di stato mentre la delega era disattivata), un Run, uno scan o una risoluzione avviati in un'altra finestra durante `disabled` restano sconosciuti e una raccolta automatica può partire mentre lavorano. Quando è fatto: a ogni passaggio da `disabled` a una modalità attiva il coordinatore conosce i lavori in corso di ogni finestra del progetto prima che la barriera sia valutata, anche se teneva già il ruolo; un lavoro già finito non viene reintrodotto e il passaggio da solo non supera la ripresa richiesta dopo l'apertura dell'editor.
