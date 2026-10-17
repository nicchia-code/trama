---
column: done
technical: false
refs:
  - panel/Board
drift: v1g8z7id
proposal: null
agent: false
created: 2026-10-17T13:26:53.818Z
finished: 2026-10-17T13:55:34.703Z
---
# Fix code to match the Model: Il Task in In progress nella Board non ha il pulsante Run

## What happens

Nella colonna Active della Board, un Task in In progress che nessun agente ha preso non mostra il pulsante Run: il pulsante compare soltanto sulle schede dei Task in To do. Dalla Board il developer non può quindi chiedere all'agente di realizzare un Task già in In progress, anche quando nessuno ci sta lavorando.

## What should happen

Il Modello dice che ogni Task della colonna Active ha il suo pulsante Run, anche quando il Task è in In progress e non è ancora preso dall'agente. Il pulsante Run di un Task in In progress deve dunque essere presente nella sua scheda, come quello dei Task in To do.

## Chosen option

**Run su ogni scheda non presa**

Ogni scheda Task in Active che nessun agente ha preso mostra il pulsante Run, anche se il Task è in In progress, con gli stessi motivi di disabilitazione dei Task in To do: un Run in corso, un Drift in risoluzione, un'attesa dell'agente. Chiederlo fa realizzare il Task all'agente come gli altri. Costo: un Task lasciato In progress a mano può essere fatto ripartire dalla Board.

## Where in the code

extension/src/webview/board/render.ts, funzione task: il pulsante Run è aggiunto alla scheda solo quando la colonna del Task è To do.
