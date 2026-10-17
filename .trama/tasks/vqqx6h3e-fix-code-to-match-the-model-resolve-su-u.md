---
column: done
technical: false
refs:
  - drift-resolution/Free
  - requirements/tech#drift-resolution
drift: l419uuy6
proposal: null
agent: false
created: 2026-10-17T17:08:39.148Z
finished: 2026-10-17T18:03:13.448Z
---
# Fix code to match the Model: Resolve su un solo Drift in una finestra che non coordina non avvia la correzione automatica

## What happens

Con la delega attiva, Resolve su un solo Drift che la delega può correggere da solo, premuto in una finestra dell'editor che non coordina il progetto, mostra l'errore «Automatic resolution waits for the project coordinator to resume» e non avvia nulla. Resolve all, premuto nella stessa finestra, invece inoltra la richiesta al coordinatore, che avvia la raccolta.

## What should happen

Il Modello dice che Resolve su un solo Drift fa partire Resolve Drifts su quel Drift, applicando la modalità corrente: con la delega attiva, la raccolta automatica di quel Drift. Le regole chiedono che un solo responsabile coordini il progetto e che Resolve, da qualunque finestra, instradi i casi automatici secondo la modalità corrente. Una finestra che non coordina deve avviare il Drift scelto, non rifiutarlo dopo il clic.

## Chosen option

**Inoltrare al coordinatore il solo Drift scelto**

La finestra manda al coordinatore il Drift scelto insieme alla richiesta di Resolve. Il coordinatore controlla che il Drift sia ancora ammissibile e avvia una raccolta che nomina soltanto quel Drift, come farebbe nella finestra che coordina. Cambia il messaggio tra le finestre, che oggi porta solo il progetto. Costo: un controllo in più per il coordinatore e il caso di un Drift nominato che, all'arrivo, non è più ammissibile.

## Where in the code

extension/src/host/controller.ts, launchAction, ramo resolve-drifts con un solo Drift: se il Drift è ammissibile alla correzione automatica, il ramo lancia l'errore quando la finestra non è il coordinatore del progetto (ownedCoordinatorRoot diverso dalla radice del progetto), prima di ogni inoltro; il ramo di Resolve all invece chiama resumeCoordinator, che inoltra la richiesta al coordinatore.
