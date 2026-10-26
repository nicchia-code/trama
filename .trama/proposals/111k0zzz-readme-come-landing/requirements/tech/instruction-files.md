---
description: "Usa quando lavori al codice che esclude i file di istruzioni degli agenti nei lanci di omp: overlay di configurazione e ricerca dei file."
---
# Tecnologia dei file di istruzioni

## agent-terminal/Agent running
- La ricerca dei file è quella di `src/core/instruction-files.ts` (`tech#setup-wizard`), chiamata dall'host a ogni lancio con omp quando `configuredIgnoreInstructionFiles()` è vero; la traduzione dei file trovati in identità di esclusione di omp è una funzione pura nello stesso modulo, testata con `bun:test`:
  - file di contesto: `context-file:project:AGENTS.md`, `context-file:project:CLAUDE.md`, `context-file:user:AGENTS.md`, `context-file:user:CLAUDE.md` (in omp un'identità di progetto vale per ogni profondità, quindi esclude anche gli `AGENTS.md` delle sottocartelle);
  - regole fisse: `rule:RULES@project` per `.omp/RULES.md`, `rule:RULES` per `~/.omp/agent/RULES.md`;
  - regole di Cursor: `rule:<nome del file senza .mdc/.md>`.

  Le identità vengono dalla documentazione di omp (`context-files.md`, `rulebook-matching-pipeline.md`) e dal codice di omp 18.12.1 (`toExtensionId` dei file di contesto e delle regole, nome delle regole di Cursor dal file senza estensione); vanno riverificate a ogni versione di omp.
- Le esclusioni del developer: l'host legge con la libreria `yaml` la chiave `disabledExtensions` di `<progetto>/.omp/config.yml` e, se lì manca, di `~/.omp/agent/config.yml`; un file assente, illeggibile o con una chiave che non è un elenco di stringhe vale come nessuna esclusione. L'elenco finale è quello del developer seguito da quelle di Trama, senza doppioni.
- L'overlay: un solo file YAML per lancio nella cartella dell'estensione (`ExtensionContext.globalStorageUri`), mai nel repository; è lo stesso file dell'overlay dell'Advisor Scanner (`tech#agent-launching`). Contiene sempre `bash.autoBackground.enabled: false`, `disabledExtensions` quando l'esclusione porta almeno un'identità di Trama, e le parti degli advisor solo nei Run con l'Advisor Scanner. La riga di comando di ogni lancio con l'hook, nel terminale e in omp Chat, porta quindi sempre `--config <overlay>`, salvo quando l'overlay non si può scrivere (il lancio parte lo stesso, senza), e `--advisor` solo con l'Advisor Scanner; `TRAMA_ADVISOR_SCANNER` resta legata solo all'Advisor Scanner. `agentTemplate`, `advisorOverlay` e `terminalEnv` di `extension/src/host/terminal-agent.ts` si separano di conseguenza; ogni valore entra nel YAML con `stringify` della libreria `yaml`.
- Va verificato con omp 18.12, ed è un criterio di accettazione, che `--config` sostituisca `disabledExtensions` delle configurazioni utente e di progetto (per questo Trama vi ricopia quelle del developer) e che i sotto-agenti `task` e `trama-analysis` e gli advisor ereditino le esclusioni del processo principale.
- `CHANGELOG.md` describes the wizard's notice and `trama.ignoreInstructionFiles`; `docs/uat.md` has the steps to try them with an `AGENTS.md` and a rule in `.cursor/rules/`.
