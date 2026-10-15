---
column: done
technical: false
refs:
  - drift-resolution/Running tasks
  - requirements/tech#drift-resolution
drift: null
proposal: null
agent: false
created: 2026-10-14T10:08:39.093Z
finished: 2026-10-14T10:15:44.721Z
---
# Report a manual Run as a Run, not as authorized corrections, in the autopilot status

Mentre un Run lanciato a mano è in corso e nessuna raccolta automatica lo guida, il comando di stato dell'autopilota deve dire la verità: non sta eseguendo correzioni autorizzate, e il motivo lo dice. La fase di correzioni autorizzate resta solo per il Run automatico della raccolta. Il Run manuale segue le sue regole e non dà alcuna autorizzazione.
