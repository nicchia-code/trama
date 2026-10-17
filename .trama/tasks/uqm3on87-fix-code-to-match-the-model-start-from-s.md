---
column: done
technical: false
refs:
  - panel/Diagram
drift: idc4rdxb
proposal: null
agent: false
created: 2026-10-16T19:49:43.098Z
finished: 2026-10-17T01:39:37.223Z
---
# Fix code to match the Model: Start from Scratch del Diagramma sceglie una cartella

## What happens

Con il Modello vuoto, Start from Scratch nel Diagramma passa dalla scelta della cartella. Con più cartelle nell'area di lavoro l'editor chiede quale usare, e se la cartella scelta non è un progetto Trama Trama la inizializza, anche quando non è il progetto aperto nel pannello.

## What should happen

Start from Scratch nel Diagramma apre subito la richiesta di setup del progetto, senza avvisi e senza inizializzare nulla, perché il progetto c'è già.

## Chosen option

**Richiesta di setup diretta dal Diagramma**

Il pulsante del Diagramma apre la richiesta di setup per il progetto aperto, senza scegliere una cartella né inizializzare nulla. Il percorso di Get Started resta com'è. Costa: un messaggio in più tra pannello ed estensione e un ramo dedicato nel gestore dei messaggi.

## Where in the code

extension/src/webview/diagram/index.ts (pulsante Start from Scratch, invia initialize); extension/src/host/controller.ts (setUp, gestione del messaggio initialize); extension/src/host/project.ts (initializeProject e pickFolder: con più cartelle nell'area di lavoro mostra il selettore)
