---
column: done
technical: true
refs:
  - requirements/cli#General
drift: null
proposal: drdvf0p2
agent: false
created: 2026-10-22T05:44:21.487Z
finished: 2026-10-22T05:46:05.026Z
---
# CLI: campi delle immagini

Quando il task è finito, la riga di comando documenta i campi con cui l'agente lega le immagini ai Task di una Proposal.

- L'aiuto di `trama proposal edit` (`--help`) elenca `images` (un elenco di `{ task, path }`: `task` è il nome completo `tasks/<identità>-<slug>.md` o l'identità di un Task della Proposal, `path` un file locale `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp` o `.svg`, assoluto o relativo alla radice del progetto) e `removeImages` (un elenco di `{ task, name }`), con un rimando alle regole: il file è copiato in `.trama/task-images/<identità del Task>/`, non versionata, e la modifica riporta a Draft una Proposal aperta.
- `docs/cli.md` descrive gli stessi campi, il blocco `Images` di `trama task show` (con il campo `images` di `--json`, i percorsi assoluti) e il campo `images` dei Task in `trama proposal show --json`.
- Il comportamento del comando e le cancellazioni sono di un altro Task di questa Proposal: qui si scrive solo la loro forma nella riga di comando e nella documentazione, seguendo `cli#General`.
