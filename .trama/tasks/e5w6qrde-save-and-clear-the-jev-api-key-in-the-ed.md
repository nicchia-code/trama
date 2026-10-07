---
column: done
technical: false
refs:
  - agent-launching
  - requirements/tech#agent-launching
  - requirements/ui#agent-launching
  - requirements/quality#agent-launching
drift: null
proposal: w2cspsnx
agent: false
created: 2026-10-07T15:00:24.373Z
finished: 2026-10-07T15:08:34.659Z
---
# Save and clear the Jev API key in the editor's secret storage

Quando è fatto, la palette ha `Trama: Set System 1 API Key` e `Trama: Clear System 1 API Key`. La prima apre una casella nascosta con titolo `Jev API key`, salva solo un valore non vuoto nell'archivio segreto dell'editor (`trama.system1.jev`) e conferma con `Trama: the Jev API key is saved.`; Esc non cambia nulla. La seconda la cancella e conferma con `Trama: the Jev API key is cleared.`. La chiave non finisce mai in impostazioni, ambiente dei terminali, file del progetto, istruzioni o log.
