---
status: resolved
resolution: proposal
refs:
  - panel/Diagram
proposal: null
task: null
origin: null
critical: false
option: null
note: null
resolvedBy: mi0ehofo
created: 2026-10-16T05:25:27.871Z
---
# Il Diagramma non offre più i pulsanti per progettare una modifica

## What happens

Nella barra del Diagramma ci sono solo gli strumenti di zoom, la scelta della Proposal e il pulsante Scan. Mancano i pulsanti che chiedono all'agente di progettare una modifica in una riga e quello che apre la scrittura di una richiesta di design, cioè quelli che la Board ha ancora.

## What should happen

Il Modello dice che i pulsanti del Diagramma chiedono all'agente di **progettare una modifica** oppure di scansionare il Sistema o la Feature guardata. Il testo del Diagramma con il Modello vuoto rimanda alla Board per progettare le modifiche, ma il Modello non dice che il Diagramma ne sia privo.

## Fix options

### Rimettere i due pulsanti nella barra del Diagramma

**Quick request…** e **Design…** tornano nella barra del Diagramma, accanto a Scan, e fanno quello che fanno sulla Board: una richiesta in una riga, o una richiesta scritta da inviare all'agente. Costo: la barra è più piena, e a larghezze strette i pulsanti vanno a capo o si spostano.

### Mostrarli solo quando il Modello non è vuoto

Gli stessi due pulsanti tornano nel Diagramma, ma restano nascosti finché il Modello è vuoto: in quel caso il Diagramma offre già **Import from Code** e **Start from Scratch**. Costo: durante il primo setup il Diagramma non offre di progettare, e il developer va alla Board per farlo.

## Where in the code

extension/src/webview/diagram/index.ts (TEMPLATE: la barra del Diagramma ha solo zoom, Proposal e Scan; il gestore dei pulsanti non c'è più); extension/src/webview/board/index.ts (Quick request… e Design… sulla Board)
