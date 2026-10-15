---
status: resolved
resolution: fix-code
refs:
  - drift-resolution/Running tasks
  - requirements/rules#drift-resolution
proposal: null
task: zwopunwy
origin: null
critical: false
option: 1
note: null
resolvedBy: i7p31mdz
created: 2026-10-14T12:51:35.395Z
---
# Ritirare la delega segna come falliti i Task non ancora avviati

## What happens

Quando il developer ritira la delega mentre una raccolta automatica è in corso, ogni Task della raccolta non ancora Done riceve il badge «autopilot failed» con il motivo del ritiro, anche quelli che non erano ancora partiti. Quei Task restano esclusi dai passi automatici successivi, come un fallimento vero, anche se il developer non ha fatto nulla di sbagliato.

## What should happen

Ritirare la delega ferma soltanto i nuovi passi automatici: il Task già iniziato può concludersi, i risultati già approvati restano e i Task non avviati restano nella loro colonna, senza essere segnati come falliti.

## Fix options

### Ritiro senza badge sui Task non avviati

I Task non ancora iniziati restano in To do senza badge e senza esclusione; quelli già in corso finiscono normalmente. Nessun Task viene marcato per una scelta del developer. Costo: dopo la riattivazione della delega la raccolta non riprende da sola i Task rimasti: servono una nuova richiesta o un Run manuale.

### Badge solo sul Task già in corso

Al momento del ritiro solo il Task già iniziato riceve il badge, con il motivo; i Task non avviati restano senza badge. Costo: serve distinguere, al momento del ritiro, i Task in corso da quelli non avviati, e un Task in corso che finisce bene porta comunque il badge fino alla fine del suo lavoro.

### Lasciare il badge su tutti i Task rimasti

Il comportamento attuale resta: ogni Task non Done della raccolta riceve il badge con il motivo del ritiro e resta escluso finché il developer non lo riprende a mano. Costo: la Board mostra come fallito ciò che è solo un ritiro, contro la regola che i Task non avviati restano nella loro colonna.

## Where in the code

extension/src/host/controller.ts: abandonCollection e failUnfinishedTasks, chiamati quando la modalità torna disabled durante un Run
