---
column: done
technical: false
refs:
  - drift-resolution/Running tasks
  - requirements/rules#drift-resolution
drift: 1301dta4
proposal: null
agent: false
created: 2026-10-14T12:55:55.913Z
finished: 2026-10-14T12:57:35.468Z
---
# Fix code to match the Model: Ritirare la delega segna come falliti i Task non ancora avviati

## What happens

Quando il developer ritira la delega mentre una raccolta automatica è in corso, ogni Task della raccolta non ancora Done riceve il badge «autopilot failed» con il motivo del ritiro, anche quelli che non erano ancora partiti. Quei Task restano esclusi dai passi automatici successivi, come un fallimento vero, anche se il developer non ha fatto nulla di sbagliato.

## What should happen

Ritirare la delega ferma soltanto i nuovi passi automatici: il Task già iniziato può concludersi, i risultati già approvati restano e i Task non avviati restano nella loro colonna, senza essere segnati come falliti.

## Chosen option

**Ritiro senza badge sui Task non avviati**

I Task non ancora iniziati restano in To do senza badge e senza esclusione; quelli già in corso finiscono normalmente. Nessun Task viene marcato per una scelta del developer. Costo: dopo la riattivazione della delega la raccolta non riprende da sola i Task rimasti: servono una nuova richiesta o un Run manuale.

## Where in the code

extension/src/host/controller.ts: abandonCollection e failUnfinishedTasks, chiamati quando la modalità torna disabled durante un Run
