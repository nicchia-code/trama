---
status: resolved
resolution: fix-code
refs:
  - drift-resolution/Running tasks
  - requirements/ui#drift-resolution
proposal: null
task: xpppqbj4
origin: null
critical: false
option: 1
note: null
resolvedBy: i7p31mdz
created: 2026-10-14T12:51:36.094Z
---
# Un Drift critico rimasto manuale mostra «autopilot failed»

## What happens

Se la delega passa da «yolo» a «enabled» dopo che una risoluzione automatica ha già approvato un Drift critico, all'avvio del Run quel Drift riceve il badge «autopilot failed» con il motivo «Critical Drift requires yolo authorization», anche se la sua correzione è già stata decisa. Il passo resta correttamente manuale, ma la Board lo mostra come errore dell'automazione.

## What should happen

Un Drift critico che torna manuale non mostra alcun errore di automazione: i suoi passi residui restano al developer senza badge, e le correzioni già approvate restano come sono.

## Fix options

### Escludere il passo senza segnarlo

Il Run parte senza il Drift critico e il suo Task di correzione resta in To do senza badge; il Drift resta risolto come deciso. Il developer avvia quel Task a mano. Costo: la Board non dice che il passo è rimasto automatico, quindi serve leggere la decisione della Proposal per capirlo.

### Nota neutra al posto del badge

Il Task critico resta in To do con una nota di testo, non di errore, che dice che il passo è manuale perché il Drift è critico. Costo: una nuova etichetta da scrivere nella Board, nel tooltip e nella CLI, e da mantenere coerente con le altre note della delega.

### Badge di errore come oggi

Il Drift riceve il badge «autopilot failed» con il motivo, come ora. Costo: il developer vede un errore di automazione su un passo che la delega non deve più toccare, contro la regola che per i critici manuali non si mostra un errore di automazione.

## Where in the code

extension/src/host/controller.ts: startAuthorizedRun, il ciclo che fallisce i Drift approvati critici quando la modalità non è yolo
