---
status: resolved
resolution: fix-code
refs:
  - requirements/tech#project
proposal: byzwilxk
task: a0yfzm3t
origin: null
option: 1
note: null
created: 2026-10-06T18:22:03.297Z
---
# Il Requisito tech#project nomina trama update-skills, un comando che non esiste

## What happens

La documentazione descrive la migrazione delle Aree al formato a frammenti con **`trama skills update`**, l'unico comando che aggiorna le skill: lo usano anche la riga di comando, le skill e il pulsante **Update Agent Skills** dell'editor.

Il Drift rg25h7jv aveva già scelto di correggere il nome nel Requisito, ma è stato chiuso correggendo il codice, quindi il Requisito non è cambiato.

## What should happen

Il Requisito `tech#project` dice che `docs/` descrive la migrazione con **`trama update-skills`**, un comando che Trama non ha. Seguirlo alla lettera vorrebbe dire documentare un comando inesistente.

## Fix options

### Correggere il nome nel Requisito

Si accetta la Proposal allegata, che in `tech#project` sostituisce `trama update-skills` con `trama skills update`. Codice e documentazione restano come sono. Costo: la revisione di una parola.

### Aggiungere il comando trama update-skills

La riga di comando accetta anche `trama update-skills` come secondo nome dell'aggiornamento delle skill e `docs/` lo usa per la migrazione. Il Requisito resta com'è, ma Trama avrebbe due nomi per la stessa azione da mantenere, documentare e provare.

## Where in the code

docs/model-format.md e docs/cli.md (migrazione delle Aree a frammenti); src/cli/commands.ts (comando skills update)
