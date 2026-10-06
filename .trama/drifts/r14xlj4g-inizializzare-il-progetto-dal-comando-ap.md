---
status: resolved
resolution: fix-code
refs:
  - panel/Closed
proposal: null
task: uh5jm6gy
origin: null
option: 2
note: null
created: 2026-10-06T17:41:40.613Z
---
# Inizializzare il progetto dal comando apre il pannello

## What happens

Quando il developer usa il comando **Trama: Initialize Project** e l'inizializzazione riesce, il pannello Trama si apre da solo sul Diagramma.

Nel Diagramma del pannello questo è un passaggio **Closed → Open** su `developer.INITIALIZE_PROJECT`, che il Modello non ha.

## What should happen

Il pannello passa da Closed a Open solo con `developer.OPEN_PANEL` (anche quando, senza progetto, il developer accetta l'offerta di inizializzarlo) o con `question-round.ROUND_OPENED`.

`developer.INITIALIZE_PROJECT` riguarda solo la Machine del progetto: crea i file di Trama, ma non dice nulla sull'apertura del pannello.

## Fix options

### Il comando inizializza e basta

Il comando Initialize Project crea il progetto e si ferma: il pannello resta chiuso finché il developer non lo apre. Il codice si allinea al Modello con una modifica piccola. Costo: dopo l'inizializzazione serve un passo in più per vedere il Diagramma, ma l'offerta dentro l'apertura del pannello continua ad aprirlo.

### Aggiungere la Transizione al Modello

Il Modello del pannello riceve in Closed la Transizione `developer.INITIALIZE_PROJECT` → Open, quando l'inizializzazione riesce, sul Diagramma. Il codice resta com'è. Costo: una Proposal da scrivere e approvare, e l'Evento del developer viene ascoltato da due Machine.

## Where in the code

extension/src/host/controller.ts, Controller.init; comando trama.init registrato in extension/src/host/main.ts
