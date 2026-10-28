---
column: done
technical: false
refs:
  - pr-check
  - requirements/docs#General
  - requirements/docs#website
drift: null
proposal: e4joewta
agent: false
created: 2026-10-28T10:21:27.991Z
finished: 2026-10-28T10:25:19.853Z
---
# Documentazione PR Check

La documentazione per chi usa Trama descrive la PR Check come la Feature `pr-check` la racconta.

Quando è fatto:
- `README.md` e `extension/README.md` dicono, fra i requisiti, che `gh` serve solo per la PR Check e per Team.
- La guida del sito, in Getting started, dice lo stesso dei requisiti; in Workflows ha la PR Check: dove si trova (scheda `Pull Requests` della vista Team, con o senza Manager mode, con origin su GitHub), quali pull request elenca (aperte e non in bozza), le due modalità scelte da Trama (Solo con il Solo mode acceso o con una PR senza `.trama/`; Collaborative altrimenti), che lavora in un worktree nella cartella privata dell'editor senza toccare la cartella aperta, che lo scan è sempre di tutto il Sistema, cosa contiene il report e che resta solo nella copia di lavoro, superato con nuovi commit e cancellato quando la PR non è più aperta, Stop, e che non parte durante un Run.
- `CHANGELOG.md` registra la PR Check e la vista Team senza Manager mode.
- `docs/uat.md` ha i passi manuali: Solo, Collaborative, una PR senza `.trama/` con il Solo mode spento, Stop, un agente che finisce senza consegnare, un report superato, una PR chiusa dopo il suo report, un worktree rimasto da una finestra chiusa durante il controllo, `Check` disabilitato durante un Run, la vista Team senza Manager mode.
