---
column: done
technical: false
refs:
  - drift-resolution/Running tasks
  - requirements/ui#drift-resolution
drift: a6obqp90
proposal: null
agent: false
created: 2026-10-14T12:55:55.921Z
finished: 2026-10-14T13:00:37.105Z
---
# Fix code to match the Model: Un Drift critico rimasto manuale mostra «autopilot failed»

## What happens

Se la delega passa da «yolo» a «enabled» dopo che una risoluzione automatica ha già approvato un Drift critico, all'avvio del Run quel Drift riceve il badge «autopilot failed» con il motivo «Critical Drift requires yolo authorization», anche se la sua correzione è già stata decisa. Il passo resta correttamente manuale, ma la Board lo mostra come errore dell'automazione.

## What should happen

Un Drift critico che torna manuale non mostra alcun errore di automazione: i suoi passi residui restano al developer senza badge, e le correzioni già approvate restano come sono.

## Chosen option

**Escludere il passo senza segnarlo**

Il Run parte senza il Drift critico e il suo Task di correzione resta in To do senza badge; il Drift resta risolto come deciso. Il developer avvia quel Task a mano. Costo: la Board non dice che il passo è rimasto automatico, quindi serve leggere la decisione della Proposal per capirlo.

## Where in the code

extension/src/host/controller.ts: startAuthorizedRun, il ciclo che fallisce i Drift approvati critici quando la modalità non è yolo
