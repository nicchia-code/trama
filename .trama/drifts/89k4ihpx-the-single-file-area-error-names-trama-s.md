---
status: resolved
resolution: proposal
refs:
  - requirements/data#General
proposal: null
task: null
origin: null
option: null
note: null
resolvedBy: l3o73qn6
created: 2026-10-09T23:45:15.436Z
---
# The single-file Area error names trama skills update, the data Requirement names trama update-skills

## What happens

Un file `.md` messo direttamente in `requirements/` è un errore di validazione che dice di lanciare **`trama skills update`**, l'unico comando che converte le Aree a file unico: lo usano anche la documentazione, la scheda Requirements e il pulsante **Update Agent Skills** dell'editor.

Lo stesso nome era già stato corretto nel Requisito `tech#project` (Drift x2qe9ww1), ma non in questo.

## What should happen

Il Requisito `data#General` dice che l'errore indica di lanciare **`trama update-skills`**, un comando che Trama non ha. Seguirlo alla lettera vorrebbe dire mandare il developer a un comando inesistente.

## Fix options

### Correggere il nome nel Requisito

Una Proposal sostituisce `trama update-skills` con `trama skills update` in `data#General`, come già fatto in `tech#project`. Codice, messaggi e documentazione restano come sono. Costo: la revisione di una parola.

### Aggiungere il comando trama update-skills

La riga di comando accetta anche `trama update-skills` come secondo nome dell'aggiornamento e l'errore lo nomina. Il Requisito resta com'è, ma Trama avrebbe due nomi per la stessa azione da mantenere, documentare e provare, contro la scelta già fatta per `tech#project`.

## Where in the code

src/core/requirements.ts (messaggio dell'Area a file unico)
