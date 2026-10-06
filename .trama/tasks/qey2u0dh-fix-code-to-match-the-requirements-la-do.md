---
column: done
technical: true
refs:
  - requirements/tech#project
drift: rg25h7jv
proposal: null
agent: false
created: 2026-10-06T18:09:50.943Z
finished: 2026-10-06T18:10:27.766Z
---
# Fix code to match the Requirements: La documentazione descrive la migrazione con trama skills update, il Requisito nomina trama update-skills

## What happens

La documentazione in `docs/` descrive la migrazione delle Aree al formato a frammenti con il comando **`trama skills update`**, che è l'unico comando che esiste per aggiornare le skill: lo usano anche la riga di comando, le skill e il pulsante dell'editor.

## What should happen

Il Requisito `tech#project` dice che `docs/` descrive la migrazione con **`trama update-skills`**, un comando che Trama non ha. Seguirlo alla lettera vorrebbe dire documentare un comando inesistente, quindi il Requisito sembra avere il nome sbagliato.

## Chosen option

**Correggere il nome nel Requisito**

Una Proposal sostituisce `trama update-skills` con `trama skills update` in `tech#project`. Codice e documentazione restano come sono. Costo: una revisione di una parola.

## Where in the code

docs/model-format.md, docs/cli.md (migrazione delle Aree a frammenti)
