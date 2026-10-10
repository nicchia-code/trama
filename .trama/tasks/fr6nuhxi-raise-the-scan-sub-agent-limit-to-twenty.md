---
column: done
technical: true
refs:
  - requirements/tech#proposal
drift: null
proposal: null
agent: false
created: 2026-10-10T09:25:09.769Z
finished: 2026-10-10T09:46:10.604Z
---
# Raise the scan sub-agent limit to twenty in trama-scan

Le istruzioni della scansione consentono ancora al massimo quattro sotto-agenti insieme fra smistamento e analisi delle Machine. Quando il lavoro è finito, la skill trama-scan dice che la scansione dà ogni Machine a un proprio sotto-agente, per lo smistamento e poi per il confronto, con al massimo venti sotto-agenti insieme in tutto; il limite di quattro resta solo per l'esplorazione del design, per la risoluzione dei Drift e per il gruppo di Task di una corsa. La skill sorgente e la sua copia installata nel progetto dicono la stessa cosa.
