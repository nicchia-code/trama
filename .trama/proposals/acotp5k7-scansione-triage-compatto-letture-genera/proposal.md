---
status: approved
base:
  requirements/tech/work.md: bc8757b3fc981c80b579a75a55cc8a6cbe1968193225507fc5e54c18e7f0884c
  requirements/tech/proposal.md: new
delete: []
created: 2026-10-10T08:21:11.358Z
scanScope:
  - ref: requirements/tech#proposal
    reason: changed
---
# Scansione: triage compatto, letture General e ambito mirato

Problema: la scansione è lenta perché legge molto. Lo step 1 della skill trama-scan legge tutte le Area (fino a ~175 KB). Il triage passa a trama classify la vista completa di ogni Machine (~46 KB), e il confronto la rilegge.

Decisioni (dal developer):
1. Lo step 1 legge solo le sezioni General delle Area; il resto di ogni Machine arriva con trama machine.
2. Il triage manda uno stato compatto a trama classify; se il classificatore risponde unavailable o c'è dubbio, si usa lo stato completo. Il confronto legge sempre la vista completa.
3. Lo scope mirato (trama proposal show, ## Scan scope) è già supportato: si documenta come uso consigliato nella Requirement di scansione. Nessun cambio di codice.

Lo stato compatto non esiste ancora nella CLI: la modifica di codice sarà un Task dopo l'approvazione.

Assunzioni prese senza chiedere: lo stato compatto è la Machine con i suoi stati, le sue transizioni e le sezioni dei Requisiti che la nominano; la Proposal non cambia il Modello, solo i Requisiti della scansione e della sua consegna.
