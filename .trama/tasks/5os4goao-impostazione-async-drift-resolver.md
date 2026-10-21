---
column: done
technical: false
refs:
  - panel/Settings
  - requirements/ui#panel/Settings
drift: null
proposal: n4a9dliq
agent: false
created: 2026-10-21T09:18:04.209Z
finished: 2026-10-21T09:19:42.109Z
---
# Impostazione Async Drift Resolver

Quando il Task è finito, l'impostazione sperimentale `trama.experimentalAsyncDriftResolver` esiste, si vede nella scheda Settings e, accesa, aggiunge la sua frase alle istruzioni giuste.

- **Dichiarazione**: `extension/package.json` dichiara `trama.experimentalAsyncDriftResolver` con `"type": "boolean"`, `"default": false`, `scope: "application"` e come `markdownDescription` la descrizione inglese di `ui#drift-resolution` («Experimental. On: before a scan, a run or an import finishes, the agent prepares the resolution question of every Drift it filed, … Only agents started by Trama follow it.»).
- **Scheda Settings**: in `SETTING_GROUPS` (`extension/src/host/settings-schema.ts`) l'impostazione sta nel gruppo `Experimental`, subito dopo `trama.experimentalParallelExecution`, così il gruppo è nell'ordine `trama.submitWhileRunning`, `trama.experimentalDriftBlocker`, `trama.experimentalAdvisorScanner`, `trama.experimentalParallelExecution`, `trama.experimentalAsyncDriftResolver`. Ha il titolo `Experimental Async Drift Resolver`, è una `Checkbox` di shadcn/ui, con la «i» il cui fumetto mostra la stessa spiegazione dell'editor; la chiave tecnica non compare. Cambiarla la salva subito nelle impostazioni utente, senza conferma, come ogni altra impostazione.
- **Lettura**: una funzione `configuredAsyncDriftResolver` in `extension/src/host/agent.ts`, accanto alle altre, legge solo il valore utente (`inspect(key).globalValue === true`); spento, assente o non booleano vale spento. Si legge quando un lavoro sta per partire. La riga di comando non legge impostazioni.
- **Frase dell'istruzione**: una costante in `extension/src/host/prompts.ts`, accanto a `DRIFT_BLOCKER_SENTENCE`, con il testo esatto "The Async Drift Resolver is on: before finishing, prepare the resolution question of every Drift filed in this job, as your skill says.". Con l'impostazione accesa `agentPrompt` la aggiunge alle istruzioni che possono registrare Drift (`mayFileDrifts`): scan del System e di Feature, implement, implement all, ogni Run di una sequenza per modello e import. Sta sulla stessa riga, subito dopo la frase del Drift blocker; senza quella, nello stesso punto: dopo la frase del limite e quelle dei sotto-agenti e dell'esecuzione parallela, prima di quella delle domande e della lingua.
- Design, Resolve Drifts e la richiesta di setup non portano mai la frase.
- Con l'impostazione spenta le istruzioni restano esattamente com'erano.
- Vale con ogni agente (`omp` e la chat di Cursor).
