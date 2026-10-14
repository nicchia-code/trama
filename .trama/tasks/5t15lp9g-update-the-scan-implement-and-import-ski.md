---
column: done
technical: true
refs:
  - requirements/tech#drift
  - requirements/rules#drift
drift: null
proposal: h9rkity1
agent: false
created: 2026-10-12T18:57:25.203Z
finished: 2026-10-12T19:47:08.058Z
---
# Update the scan, implement and import skills to the Drift rules

Aggiornare le skill distribuite trama-scan, trama-implement e trama-import (sorgenti in skills/) alle regole dei Drift: le Fix options devono raggiungere ciò che dovrebbe succedere senza cambiare Modello né Requisiti; il Drift senza Fix options va con una Proposal allegata quando nessuna correzione del codice rispetta insieme Modello e Requisiti; prima di archiviare un Drift l'agente legge i Drift risolti sugli stessi riferimenti con trama drift list --all --ref e non riarchivia una differenza dismessa finché Modello o Requisito dicono la stessa cosa; trama-scan e il sotto-agente di confronto usano questa lettura sui riferimenti che confrontano; trama-implement e trama-scan spiegano --previous e il Drift precedente quando il Drift nasce dal Task di correzione. Non toccare la skill trama-resolve-drifts, che non è in questo Task.
