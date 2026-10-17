---
status: approved
base:
  requirements/tech/settings.md: b5a5c2953bd3310c432cb88aa9804bc73c8268f7e379bc6039b01defc725c385
  requirements/quality/main.md: 28d331c7d8c69fd2dd90d2b1eb867d62665e62e08a1a0062c9da6cf20724ef62
  requirements/ui/settings-specs.md: 67a2dd2785ec684e27a09c1ca0fafc4ff6e95298c8d0892dc9dff0aba823ebaf
  proposal.md: new
delete: []
request: 2026-10-17T05-46-39
created: 2026-10-17T03:51:57.234Z
---
# Elenco di omp: un errore di avvio non diventa più una lista non valida

La scheda Settings mostra «omp models did not return a valid list» anche se omp produce un elenco valido. Causa osservata nel codice: omp è uno script con shebang #!/usr/bin/env bun; senza bun nel PATH dell'editor esce con exit 127, e ompModels() tratta ogni exit diverso da 0 come lista non valida (extension/src/host/model-lists.ts). Decisioni prese nell'intervista:
- trama.ompPath assoluto: la cartella di quel percorso va in testa al PATH di omp, poi il PATH dell'editor.
- trama.ompPath vuoto: in testa al PATH di omp va la cartella di bun, BUN_INSTALL/bin se la variabile è impostata, altrimenti ~/.bun/bin.
- Un exit diverso da 0 è sempre un errore, anche con un JSON valido su stdout: nessun elenco.
- Il motivo è «omp exited with code N», in inglese, con il solo codice di uscita: né stderr né output di omp in error.
- Il testo «omp models did not return a valid list» resta solo per un JSON non valido o senza `models`; per un exit code diverso da 0 non compare più. Resta invariato il resto della scheda: omp not found, omp models did not answer within 15 s, Claude Code senza elenco.
Assunzioni: la Model non cambia; il terminale dell'agente continua a lanciare omp dalla shell; Trama non cerca omp in altre cartelle, aggiunge al PATH di omp solo la cartella di `trama.ompPath` o quella di bun.
