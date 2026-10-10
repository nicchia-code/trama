---
status: resolved
resolution: proposal
refs:
  - requirements/rules#project
  - project
proposal: null
task: null
origin: null
option: null
note: null
resolvedBy: 48s86zzo
created: 2026-10-09T08:46:29.805Z
---
# Init and skills update install trama-resolve-drifts, which rules#project does not list

## What happens

Inizializzare il progetto e aggiornare le skill installano **cinque** skill dell'agente: oltre a trama-design (con il suo riferimento di formato), trama-scan, trama-implement e trama-import, anche **trama-resolve-drifts**, la skill che il pulsante Resolve Drifts nomina nell'istruzione. È ciò che chiedono anche `tech#General` (le skill in `skills/` sono cinque) e `tech#work` (la skill della risoluzione sta con le altre).

## What should happen

`rules#project` dice che l'inizializzazione installa le skill **trama-design con il suo riferimento di formato, trama-scan, trama-implement e trama-import**: un elenco di quattro, senza trama-resolve-drifts. Letto alla lettera, il Requisito esclude la quinta skill, mentre i Requisiti tecnici la vogliono installata.

## Fix options

### Add trama-resolve-drifts to rules#project

Il Requisito `rules#project` elenca anche trama-resolve-drifts fra le skill che l'inizializzazione installa, allineato a `tech#General` e `tech#work`. Il codice resta com'è. Costo: una riga di Requisito da cambiare con una Proposal; nessun lavoro sul codice.

### Stop installing trama-resolve-drifts

Inizializzare e aggiornare le skill installano solo le quattro skill dell'elenco. Resolve Drifts manderebbe però all'agente un'istruzione che nomina una skill che non ha, e il codice contraddirebbe `tech#General` e `tech#work`, che andrebbero cambiati a loro volta. Sconsigliato.

## Where in the code

src/cli/skills.ts (SKILLS), src/cli/commands.ts (init, skills update)
