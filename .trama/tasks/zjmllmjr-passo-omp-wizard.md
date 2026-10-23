---
column: done
technical: false
refs:
  - setup-wizard
  - requirements/rules#setup-wizard
  - requirements/tech#setup-wizard
  - requirements/ui#setup-wizard
drift: null
proposal: 3xin5lv7
agent: false
created: 2026-10-23T14:00:45.444Z
finished: 2026-10-23T14:11:40.912Z
---
# Passo omp del wizard

Il passo del wizard che si chiamava Agent si chiama omp, dice che omp è obbligatorio, lo verifica, lo aggiorna e offre di installarlo. Alla fine:

- Il passo si chiama `omp` ovunque: indicatore dei passi (`Path`, `omp`, `Models`, `Project`, `Folders`, `Advanced`, `Summary`), titolo, riepilogo, chiavi del passo (`trama.ompPath`, `trama.terminalLocation`, `trama.ignoreInstructionFiles`), file di istruzioni. La frase del passo è «omp is required: Trama runs every agent with omp.».
- La verifica si rifà quando il passo si mostra, quando il percorso di omp del passo cambia (anche non salvato) e quando finisce il terminale di installazione. Cerca il programma come i lanci, fa il controllo degli aggiornamenti con la stessa validità di un'ora e, con una versione nuova, aggiorna omp da sé prima di dire l'esito; poi chiama `omp models --json`.
- Messaggi: durante l'aggiornamento `agentCheck { ompPath, state: "updating", version }`; alla fine `agentCheck { ompPath, state: "done", ok, missing, version?, models?, error?, updateError? }`. Una risposta per un `ompPath` diverso da quello del passo si ignora. `installOmp` apre il terminale di installazione.
- Riga della verifica (`aria-live="polite"`): «Checking omp…» con `Loader`; «Updating omp to <versione>…» con `Loader`; con omp che risponde `CircleCheck` e «omp <versione> answered with <N> models.»; dopo un aggiornamento fallito `TriangleAlert` e «Could not update omp (<motivo>). omp <versione> answered with <N> models.»; con omp che non risponde `TriangleAlert`, il motivo di sempre e « Trama cannot work without omp.», e quando omp manca il pulsante `Install omp`.
- `Next` del passo `omp` non è disponibile finché la verifica non dice che omp risponde con il percorso del passo: omp che manca, che non risponde o la cui verifica è in corso lo tengono fermo, con tooltip e motivo «omp must answer before you go on.»; un aggiornamento fallito con omp che risponde non lo ferma. Vale in tutti i modi del wizard.
- La logica pura (`extension/src/webview/wizard/logic.ts`) e i suoi test `bun:test` coprono il nuovo nome del passo, la disponibilità di `Next` per ogni esito della verifica e le righe della verifica.
