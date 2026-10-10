---
status: resolved
resolution: fix-code
refs:
  - task/Taken by the agent
  - requirements/rules#task
proposal: null
task: 8xtd0se8
origin: null
option: 1
note: null
resolvedBy: eb51z7tp
created: 2026-10-10T16:47:59.489Z
---
# A pending multi-Task Run ignores Tasks taken before delivery

## What happens

Run all To do e Run this design controllano che nessun Task del loro ambito sia preso quando arriva la richiesta. Se un agente prende un Task mentre la nuova corsa aspetta di essere inviata, per esempio durante la preparazione del terminale o mentre un precedente invio alla chat occupa la consegna, la nuova istruzione può essere inviata comunque. La presa intervenuta durante questa attesa non annulla la richiesta già ammessa: può partire una seconda corsa sullo stesso ambito mentre un Task risulta Taken by the agent.

## What should happen

Run all To do deve restare indisponibile mentre qualunque Task è preso, e Run this design mentre è preso qualunque Task di quel design. Una richiesta ancora in preparazione non costituisce una corsa avviata: la corsa comincia soltanto alla consegna effettiva della sua istruzione. Se prima di quella consegna un Task pertinente viene preso, la richiesta non deve inviare nulla. La presa non va liberata né ignorata per autorizzare il nuovo Run; i Task di altri design non devono bloccare Run this design.

## Fix options

### Recheck eligibility immediately before delivery

Rileggere le prese dei Task pertinenti quando la consegna può ancora essere fermata, oltre al controllo iniziale. Se un Task è stato preso durante la preparazione, rifiutare il Run senza inviare la sua istruzione e spiegare il motivo al developer. Si riusa la stessa regola di disponibilità per entrambi i Run; il costo è rileggere lo stato corrente durante la consegna.

### Cancel pending Runs when a Task is taken

Seguire le richieste di Run ancora in preparazione e annullarle appena una presa pertinente le rende indisponibili. L’annullamento deve impedire la consegna anche se la preparazione del terminale o della chat termina più tardi; Run this design segue soltanto i propri Task. La disponibilità richiesta resta uguale, ma occorre gestire il ciclo di vita e la cancellazione delle richieste pendenti.

## Where in the code

extension/src/host/controller.ts: launchAction, controlli implement-all e implement-design e refusal/canSend; extension/src/host/agent.ts: launchAgent, terminalRun, questionEndpoint e inSendTurn/openChat; src/core/design.ts: runBlocker e takenBlocker.
