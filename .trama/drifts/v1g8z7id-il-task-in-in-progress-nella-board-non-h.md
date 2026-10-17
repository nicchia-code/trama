---
status: resolved
resolution: fix-code
refs:
  - panel/Board
proposal: null
task: ekd03582
origin: null
critical: false
option: 1
note: null
resolvedBy: ev8ngrev
created: 2026-10-17T13:17:28.500Z
---
# Il Task in In progress nella Board non ha il pulsante Run

## What happens

Nella colonna Active della Board, un Task in In progress che nessun agente ha preso non mostra il pulsante Run: il pulsante compare soltanto sulle schede dei Task in To do. Dalla Board il developer non può quindi chiedere all'agente di realizzare un Task già in In progress, anche quando nessuno ci sta lavorando.

## What should happen

Il Modello dice che ogni Task della colonna Active ha il suo pulsante Run, anche quando il Task è in In progress e non è ancora preso dall'agente. Il pulsante Run di un Task in In progress deve dunque essere presente nella sua scheda, come quello dei Task in To do.

## Fix options

### Run su ogni scheda non presa

Ogni scheda Task in Active che nessun agente ha preso mostra il pulsante Run, anche se il Task è in In progress, con gli stessi motivi di disabilitazione dei Task in To do: un Run in corso, un Drift in risoluzione, un'attesa dell'agente. Chiederlo fa realizzare il Task all'agente come gli altri. Costo: un Task lasciato In progress a mano può essere fatto ripartire dalla Board.

### Run sempre presente, ma spento in In progress

Ogni scheda Task in Active mostra il pulsante Run. Sulle schede In progress il pulsante resta spento, con un motivo che dice che il Task è già in corso e che si riprende dalla riga di comando. Il developer vede sempre il pulsante e capisce perché non può usarlo. Costo: un pulsante spento in più nella colonna e un motivo nuovo da scrivere.

## Where in the code

extension/src/webview/board/render.ts, funzione task: il pulsante Run è aggiunto alla scheda solo quando la colonna del Task è To do.
