---
status: approved
base:
  requirements/tech/general.md: f0cac5d1cfffd7e42971f65b5fc22462c46434d6e1fbed35322224a2dd0d95c5
delete: []
created: 2026-10-06T18:21:45.409Z
scanScope:
  - ref: requirements/tech#project
    reason: changed
---
# Nominare trama skills update nel Requisito tech#project

Il Requisito `tech#project` dice che `docs/` descrive la migrazione delle Aree al formato a frammenti con `trama update-skills`, un comando che Trama non ha: l'aggiornamento delle skill è `trama skills update`, che usano già la riga di comando, le skill, la documentazione e il pulsante dell'editor.

Il Drift rg25h7jv aveva scelto di correggere il nome nel Requisito, ma è stato chiuso correggendo il codice, e il Requisito è rimasto com'era.

Scelte (da verificare dal developer):
- Si cambia solo il nome del comando in quella frase di `tech#project`; nessun altro testo, né Modello né codice.
