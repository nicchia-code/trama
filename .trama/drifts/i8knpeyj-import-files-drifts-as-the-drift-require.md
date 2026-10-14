---
status: resolved
resolution: fix-code
refs:
  - requirements/tech#drift
proposal: null
task: vbjvk0bb
origin: 5t15lp9g
critical: false
option: 1
note: null
resolvedBy: 0xmhqkfc
created: 2026-10-12T19:39:01.070Z
---
# Import files Drifts as the drift Requirement says, against ADR 0008

## What happens

La skill trama-import non archivia nessun Drift: le differenze fra documentazione e codice le registra come dubbi nella Proposal di importazione, perché nell'importazione il Modello è il codice stesso.

## What should happen

Il requisito della tecnologia dei Drift dice che trama-import archivia Drift con i due lati e le Fix options, come le altre skill che li archiviano. L'ADR 0008 aveva però scartato i Drift per le differenze fra documentazione e codice, perché un Drift per ogni differenza ne farebbe molti a ogni importazione. Il requisito e la decisione non si possono seguire insieme: la scelta spetta al developer.

## Fix options

### Import files a Drift for each difference

trama-import archivia un Drift per ogni differenza fra documentazione e codice, con i due lati e le Fix options, come dice il requisito. Nessuna differenza resta un semplice dubbio. Il primo import di un progetto grande può generare molti Drift da decidere, e torna la strada che l'ADR 0008 aveva scartato.

### Import files Drifts only for stated rules

trama-import archivia un Drift solo quando la documentazione dichiara una regola che il codice non rispetta; le altre differenze restano dubbi nella Proposal. Il requisito vale per i casi che contano e il numero di Drift resta basso, come voleva l'ADR 0008. Costa una distinzione che l'agente deve fare caso per caso.
