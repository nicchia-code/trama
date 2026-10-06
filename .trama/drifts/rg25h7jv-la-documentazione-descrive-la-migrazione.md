---
status: resolved
resolution: fix-code
refs:
  - requirements/tech#project
proposal: null
task: qey2u0dh
origin: null
option: 1
note: null
created: 2026-10-06T18:00:49.458Z
---
# La documentazione descrive la migrazione con trama skills update, il Requisito nomina trama update-skills

## What happens

La documentazione in `docs/` descrive la migrazione delle Aree al formato a frammenti con il comando **`trama skills update`**, che è l'unico comando che esiste per aggiornare le skill: lo usano anche la riga di comando, le skill e il pulsante dell'editor.

## What should happen

Il Requisito `tech#project` dice che `docs/` descrive la migrazione con **`trama update-skills`**, un comando che Trama non ha. Seguirlo alla lettera vorrebbe dire documentare un comando inesistente, quindi il Requisito sembra avere il nome sbagliato.

## Fix options

### Correggere il nome nel Requisito

Una Proposal sostituisce `trama update-skills` con `trama skills update` in `tech#project`. Codice e documentazione restano come sono. Costo: una revisione di una parola.

### Aggiungere il comando trama update-skills

La riga di comando accetta anche `trama update-skills` come secondo nome dell'aggiornamento delle skill, e `docs/` lo usa per la migrazione. Il Requisito resta com'è, ma Trama avrebbe due nomi per la stessa azione da mantenere e documentare.

## Where in the code

docs/model-format.md, docs/cli.md (migrazione delle Aree a frammenti)
