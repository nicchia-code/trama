---
status: resolved
resolution: proposal
refs:
  - task/Taken by the agent
  - requirements/tech#agent-hook
proposal: null
task: null
origin: null
option: null
note: null
resolvedBy: sjsoc8fq
created: 2026-10-09T12:33:28.266Z
---
# Closing a hooked agent's terminal releases its Tasks without a Transition in the Task Machine

## What happens

Quando il developer chiude il terminale integrato (o la sua scheda) in cui lavora un agente con un hook (omp), i Task presi da quel terminale sono **rilasciati** e tornano in To do.

Per gli altri agenti la chiusura del terminale non rilascia nulla. Il codice segue il Requisito `tech#agent-hook`, che chiede questo rilascio alla chiusura, ma nel Diagramma del Task non c'è la Transizione corrispondente.

## What should happen

Nella Machine del Task, da Taken by the agent si torna in To do solo per la fine del comando del terminale che lo aveva preso, per l'hook a riposo di quel terminale o per gli Eventi della chat di Cursor; il developer lo riprende con `task take-back`.

La **chiusura del terminale** non è un Evento a cui il Task reagisce: chiudere il terminale di omp non dovrebbe cambiare il Task, che resta preso finché il developer non lo riprende.

## Fix options

### Add the terminal closing to the Task Machine

Il codice resta. Si aggiunge a Taken by the agent la Transizione su `terminal.CLOSED` verso To do, solo per il terminale di un agente con un hook che aveva preso il Task, come già dice il Requisito. Costo: solo una modifica al Modello; per gli altri agenti nulla cambia.

### Stop releasing Tasks when a hooked terminal is closed

Chiudere il terminale di omp non tocca più i Task, come dice oggi la Machine del Task: restano presi finché il developer non usa `task take-back`, o finché la fine del comando non li rilascia se si sceglie così per l'altra differenza degli agenti con un hook. Costo: il Requisito `tech#agent-hook` va corretto e torna il caso del Task bloccato dopo la chiusura.

### Release on closing for every agent terminal

La chiusura di qualunque terminale dell'agente rilascia i Task che aveva preso, e la Machine del Task riceve la Transizione su `terminal.CLOSED` senza eccezioni. Copre anche gli agenti senza hook il cui terminale viene chiuso senza che la fine del comando arrivi. Costo: Modello e Requisiti cambiano per tutti i launcher integrati.

## Where in the code

`extension/src/host/agent.ts`: il gestore di `onDidCloseTerminal` in `watchAgentTerminal` rilascia i Task solo quando `isHooked` è vero.
