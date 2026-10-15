---
column: done
technical: false
refs:
  - drift-resolution/Free
  - drift-resolution/Resolving
  - requirements/tech#drift-resolution
drift: null
proposal: 2pa6eli4
agent: false
created: 2026-10-14T08:41:24.279Z
finished: 2026-10-14T09:40:12.928Z
---
# Withhold automatic steps while the other windows cannot be verified

Prima di concedere un nuovo passo automatico, il coordinatore deve poter verificare il proprio ruolo e il quadro dei lavori delle altre finestre vive del progetto. Se una finestra viva non risponde alla richiesta dei lavori, o il ruolo non è confermato, il coordinatore non concede nuovi passi automatici e mostra il motivo nello stato dell'autopilota. Oggi la richiesta dei lavori considera il quadro verificato appena una finestra risponde, e la raccolta procede anche quando un'altra finestra viva non ha risposto.
