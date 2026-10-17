---
status: resolved
resolution: fix-code
refs:
  - panel/Diagram
proposal: null
task: uqm3on87
origin: null
critical: false
option: 1
note: null
resolvedBy: 8yjv0gc1
created: 2026-10-16T19:45:59.083Z
---
# Start from Scratch del Diagramma sceglie una cartella

## What happens

Con il Modello vuoto, Start from Scratch nel Diagramma passa dalla scelta della cartella. Con più cartelle nell'area di lavoro l'editor chiede quale usare, e se la cartella scelta non è un progetto Trama Trama la inizializza, anche quando non è il progetto aperto nel pannello.

## What should happen

Start from Scratch nel Diagramma apre subito la richiesta di setup del progetto, senza avvisi e senza inizializzare nulla, perché il progetto c'è già.

## Fix options

### Richiesta di setup diretta dal Diagramma

Il pulsante del Diagramma apre la richiesta di setup per il progetto aperto, senza scegliere una cartella né inizializzare nulla. Il percorso di Get Started resta com'è. Costa: un messaggio in più tra pannello ed estensione e un ramo dedicato nel gestore dei messaggi.

### Usare la cartella del progetto aperto

Il pulsante del Diagramma passa all'inizializzazione la cartella del progetto aperto, così l'editor non chiede nulla e nessun'altra cartella viene toccata. La richiesta di setup va al progetto di quella cartella. Costa: l'inizializzazione riceve una cartella da chi la chiama, e Get Started continua a scegliere la sua.

## Where in the code

extension/src/webview/diagram/index.ts (pulsante Start from Scratch, invia initialize); extension/src/host/controller.ts (setUp, gestione del messaggio initialize); extension/src/host/project.ts (initializeProject e pickFolder: con più cartelle nell'area di lavoro mostra il selettore)
