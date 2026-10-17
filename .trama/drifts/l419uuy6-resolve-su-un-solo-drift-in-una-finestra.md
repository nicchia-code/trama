---
status: resolved
resolution: fix-code
refs:
  - drift-resolution/Free
  - requirements/tech#drift-resolution
proposal: null
task: vqqx6h3e
origin: null
critical: false
option: 1
note: null
resolvedBy: sbacvxid
created: 2026-10-17T16:37:55.750Z
---
# Resolve su un solo Drift in una finestra che non coordina non avvia la correzione automatica

## What happens

Con la delega attiva, Resolve su un solo Drift che la delega può correggere da solo, premuto in una finestra dell'editor che non coordina il progetto, mostra l'errore «Automatic resolution waits for the project coordinator to resume» e non avvia nulla. Resolve all, premuto nella stessa finestra, invece inoltra la richiesta al coordinatore, che avvia la raccolta.

## What should happen

Il Modello dice che Resolve su un solo Drift fa partire Resolve Drifts su quel Drift, applicando la modalità corrente: con la delega attiva, la raccolta automatica di quel Drift. Le regole chiedono che un solo responsabile coordini il progetto e che Resolve, da qualunque finestra, instradi i casi automatici secondo la modalità corrente. Una finestra che non coordina deve avviare il Drift scelto, non rifiutarlo dopo il clic.

## Fix options

### Inoltrare al coordinatore il solo Drift scelto

La finestra manda al coordinatore il Drift scelto insieme alla richiesta di Resolve. Il coordinatore controlla che il Drift sia ancora ammissibile e avvia una raccolta che nomina soltanto quel Drift, come farebbe nella finestra che coordina. Cambia il messaggio tra le finestre, che oggi porta solo il progetto. Costo: un controllo in più per il coordinatore e il caso di un Drift nominato che, all'arrivo, non è più ammissibile.

### Mostrare il motivo sul pulsante invece dell'errore

Nella finestra che non coordina Resolve sul Drift ammissibile resta disabilitato, con il motivo nel suggerimento e nel nome accessibile, come gli altri motivi della Board, invece di dare un errore dopo il clic. Il developer usa la finestra che coordina oppure Resolve all. Cambia la Board, che deve sapere chi coordina il progetto. Costo: da quella finestra il Drift non parte e il pulsante resta senza azione.

## Where in the code

extension/src/host/controller.ts, launchAction, ramo resolve-drifts con un solo Drift: se il Drift è ammissibile alla correzione automatica, il ramo lancia l'errore quando la finestra non è il coordinatore del progetto (ownedCoordinatorRoot diverso dalla radice del progetto), prima di ogni inoltro; il ramo di Resolve all invece chiama resumeCoordinator, che inoltra la richiesta al coordinatore.
