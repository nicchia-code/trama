---
refs:
  - solo-mode
  - solo-switch
  - developer.TURN_ON_SOLO_MODE
  - developer.TURN_OFF_SOLO_MODE
  - developer.CHANGE_SOLO_EXCLUSIONS
  - requirements/data#solo-switch
  - requirements/rules#solo-switch
  - requirements/tech#solo-switch
  - requirements/tech#General
  - requirements/cli#General
  - requirements/data#announcement
---
# Solo mode: core e CLI

Solo mode permette di usare Trama da soli in un repository dove gli altri non lo usano: i file di Trama restano solo nella copia di lavoro e non entrano mai nei commit. Vale per la copia di lavoro, mai per l'utente, e non è una chiave delle impostazioni dell'editor.

A Task finito:

- `src/core/solo-mode.ts`, con i test `bun:test`, legge e scrive `.trama/solo/mode.json` (`{ "exclusions": "folders" | "files" }`, in una cartella con il proprio `.gitignore` `*`; un file non valido vale acceso con `folders`), costruisce il blocco fra `# trama solo mode` e `# end trama solo mode` per il tipo scelto, il prefisso del progetto nel repository e la cartella delle skill, e lo sostituisce o lo toglie nel testo di `.git/info/exclude` lasciando intatte le altre righe e i fine riga. Riscrivere lo stesso blocco non cambia il file.
- Tipi: `folders` esclude `.trama/`, la cartella delle skill e `.omp/`; `files` esclude `.trama/`, le skill `trama-*` (comprese le `trama-req-*`), `.omp/agents/trama-analysis.md`, `.omp/agents/trama-implementer.md` e `.omp/WATCHDOG.yml`. I percorsi sono ancorati alla radice del repository con il prefisso di `git rev-parse --show-prefix`; il file è quello di `git rev-parse --git-path info/exclude`, creato se manca.
- Il helper `git()` passa da `src/core/compared.ts` a `src/core/git.ts`, condiviso con l'impronta del codice.
- Accendere: solo in un repository git, altrimenti rifiuto con `Solo mode needs a git repository.` e nulla scritto; scrive il file e il blocco; i file di Trama già tracciati (`git ls-files` sugli stessi percorsi) non lo impediscono e sono restituiti come `tracked`. Spegnere: toglie il blocco e il file. Cambiare tipo: riscrive file e blocco. Una scrittura fallita non cambia nulla e dice perché.
- `trama project new` e `trama project edit` accettano `solo?: "off" | "folders" | "files"`. `project new` con `solo` scrive Solo mode prima di ogni altro file del progetto e, se fallisce, non crea nulla. `project edit` con solo `solo` cambia solo Solo mode, senza reinstallare le skill; con `skillsDir` il blocco usa quella cartella, altrimenti `.agents/skills`. Il risultato, anche `--json`, porta `solo` e `tracked`; `project show --json` porta `solo`.
- La riparazione: con Solo mode acceso, a ogni apertura ordinaria di Trama, nello stesso controllo in sottofondo delle skill, Trama riscrive il blocco in silenzio quando manca o è diverso da quello atteso con il tipo e `trama.skillsDir` di adesso; una scrittura fallita si segnala come un aggiornamento delle skill fallito.
- `tech#General` dice che `.trama/` è versionato con git salvo in Solo mode.
- `README.md`, `extension/README.md`, `docs/` (comprese le pagine della CLI) e `CHANGELOG.md` descrivono Solo mode, il blocco, i due tipi, i file già tracciati e che `.trama/` non è versionato altrove; `docs/uat.md` ha i passi manuali.
