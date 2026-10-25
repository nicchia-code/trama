---
refs:
  - manager-mode
  - setup-wizard
  - panel/Settings
  - panel/Closed/developer.SHOW_SETTINGS
  - panel/Open/developer.SHOW_SETTINGS
  - panel/Closed/developer.OPEN_GUIDED_SETUP
  - panel/Open/developer.OPEN_GUIDED_SETUP
  - developer.TURN_ON_MANAGER_MODE
  - developer.TURN_OFF_MANAGER_MODE
  - requirements/data#manager-mode
  - requirements/rules#manager-mode
  - requirements/ui#manager-mode
---
# Manager mode

Manager mode è l'interruttore di Team per una copia di lavoro, sul modello di Solo mode. Quando il Task è finito:

- Manager mode è registrata in `.trama/manager/mode.json` (un oggetto `{}`), presente solo mentre è accesa, in una cartella `.trama/manager/` con un `.gitignore` che contiene `*`: non entra mai in un commit, con Solo mode accesa o spenta. Un file non JSON vale come accesa e la prossima scrittura lo sostituisce. LF e newline finale.
- Il repository GitHub del progetto si legge da `git remote get-url origin` con l'helper `git()` di `src/core/git.ts`; valgono `https://`, `http://`, `git@github.com:` e `ssh://git@github.com/`, con o senza `.git` e `/` finali, e il risultato è `<owner>/<repo>` in minuscolo. Ogni altro host, GitHub Enterprise compreso, non è GitHub. La logica pura sta in `src/core/manager-mode.ts`, con test `bun:test`, senza dipendere da Bun.
- Team è disponibile solo con Manager mode registrata e origin su GitHub; la disponibilità si ricalcola a ogni apertura del pannello, a ogni quadro e quando si mostrano la vista Team o il gruppo Project dei Settings. Accendere Manager mode senza origin su GitHub è rifiutato con `Manager Mode needs a repository on GitHub (the origin remote).`; spegnerla cancella solo il file di Manager mode, mai le persone né i file del lavoro di Team. Quando si spegne, la Machine `manager-mode` emette `TURNED_OFF`.
- Settings, gruppo `Project`, dopo la riga di Solo mode: la riga `Manager Mode` (componente proprio in `extension/src/webview/settings/`, non una chiave di `contributes.configuration`, non in `SETTING_GROUPS` né in `EXPLICIT_TITLES`, non accettata da `setSetting`) con la descrizione «Plan work for your team and publish it as GitHub issues. Only for this working copy.» e la riga `Repository: <owner>/<repo> · origin on GitHub`; senza origin su GitHub casella disabilitata e non spuntata, con lucide `Info` e `Needs a repository on GitHub (the origin remote).`, e la riga del repository `No origin remote` o `Origin is not on GitHub`. Una scrittura fallita mostra `Trama: could not save Manager Mode: <reason>.` e la riga torna al valore registrato.
- Messaggi: webview → host `setManagerMode { on }`; host → webview `managerMode { available, recorded, repository, reason }` al `ready`, quando Settings o Team diventano visibili e dopo ogni scrittura. L'host legge e scrive attraverso lo stesso codice in-process di `trama project edit`.
- Wizard di setup, passo `Project`, in ogni modo (primo setup, Guided setup, Modello vuoto): un riquadro `Repository` con `<owner>/<repo> · origin on GitHub`, `No origin remote` o `Origin is not on GitHub` (nel primo setup del folder scelto in `Path`), poi per ultima la riga `Manager Mode`, uguale ai Settings. Parte spenta nel primo setup e dal valore del progetto negli altri modi; nulla si scrive prima della conferma. Il riepilogo dice `Manager Mode: On` o `Off`, evidenziato quando cambia il valore del progetto. `confirmSetup` porta `manager`: il primo setup lo passa a `trama project new`, che scrive Manager mode dopo i file del progetto e, se fallisce, lo dice senza disfare il progetto; gli altri modi chiamano `project edit` con `manager` dopo le impostazioni e prima di proseguire con il percorso, solo quando cambia. Nel Guided setup la conferma salva le impostazioni e Manager mode.
- CLI: `trama project new` e `trama project edit` accettano `manager?: boolean` (`true` scrive il file, rifiutato senza origin su GitHub; `false` lo cancella; `project edit` con il solo `manager` non reinstalla le skill); `trama project show` stampa `Manager mode: on (<owner>/<repo>)`, `Manager mode: on, but origin is not on GitHub` o `Manager mode: off`, e con `--json` i campi `manager` e `managerRepository`.
- I testi sono in inglese e non seguono `trama.language`. Documentazione: `README.md`, `extension/README.md`, `docs/` e `CHANGELOG.md` descrivono Manager mode e che vale solo per la copia di lavoro; `docs/cli.md` i campi di `project`; `docs/uat.md` i passi manuali (accendere e spegnere, progetto senza origin GitHub, wizard in ogni modo).

Le immagini legate a questo Task mostrano il passo Project del wizard con Manager Mode, spuntata e disabilitata.
