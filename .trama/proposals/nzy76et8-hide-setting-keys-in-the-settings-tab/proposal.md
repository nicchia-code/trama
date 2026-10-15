---
status: approved
base:
  editor/panel.md: new
  requirements/ui/panel.md: 1485434b254ade5d8ebc78404a498d73a07e3680cd629649f33fac4423e662a9
  editor-panel/panel.md: 6be0aa90fa33364aad07f1130f77f20c837435352a118dbba8d28e41470d4ead
delete: []
created: 2026-10-15T05:37:02.437Z
---
# Hide setting keys in the Settings tab

Il developer apre la scheda Settings proprio per non aprire il JSON delle impostazioni: la chiave tecnica sotto ogni titolo non gli serve.

Decisioni:
- La chiave completa (per esempio `trama.maxParallelAgents`) non compare più nella scheda Settings: ogni impostazione mostra titolo, «i» e controllo.
- Il messaggio di errore di una scrittura fallita nomina il titolo leggibile invece della chiave.
