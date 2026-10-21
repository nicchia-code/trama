---
column: done
technical: false
refs:
  - panel/Settings
  - requirements/ui#panel/Settings
  - requirements/ui#agent-terminal
  - requirements/ui#agent-launching
  - requirements/ui#drift-resolution
drift: null
proposal: suaaekyh
agent: false
created: 2026-10-21T14:32:41.460Z
finished: 2026-10-21T14:34:46.718Z
---
# Impostazioni concise e tendine

Due cambi nella scheda Settings e nei campi delle impostazioni.

**Spiegazioni brevi.** La `markdownDescription` di ogni impostazione nel manifest (`extension/package.json`) ha al massimo due frasi brevi, circa 160 caratteri, ed è esattamente il testo che i Requisiti fissano:
- `trama.theme`: «Colours of the Trama panel. Auto (the default) follows the editor's theme; Light and Dark fix it.» (le `enumDescriptions` restano).
- `trama.agent`, `trama.ompPath`, `trama.terminalLocation`, `trama.autoExit`, `trama.submitWhileRunning`: i testi di `ui#agent-terminal`.
- `trama.analysis`, `trama.scan`, `trama.execution`, `trama.maxParallelAgents`, `trama.skillsDir`, `trama.language`, `trama.experimentalContextSharing`: i testi di `ui#agent-launching`.
- `trama.experimentalDriftBlocker`, `trama.experimentalAdvisorScanner`, `trama.experimentalParallelExecution`: i testi di `ui#panel/Settings`.
- `trama.experimentalAsyncDriftResolver`: il testo di `ui#drift-resolution`.

Il fumetto della «i», la descrizione accessibile del controllo e la pagina delle impostazioni dell'editor mostrano questi testi brevi. Le spiegazioni lunghe che spariscono dal manifest restano descritte nei Requisiti; `README.md` ed `extension/README.md` non ripetono i testi lunghi come se fossero quelli mostrati.

**Tendina dei modelli larga.** Nei campi `trama.analysis`, `trama.scan` e `trama.execution` la tendina dei suggerimenti è larga quanto la voce più lunga dell'elenco intero (valore e nome leggibile), e almeno quanto il campo; mentre il developer scrive e l'elenco si filtra la larghezza non cambia. Il campo resta largo quanto la sua colonna. Nessuna voce si accorcia con i puntini: quando la voce più lunga non entra nel pannello, la tendina è larga quanto il pannello e le voci troppo lunghe vanno a capo. Vale in ogni posto in cui compare il campo: la scheda Settings, il wizard di setup e la finestra del modello sulla Board.
