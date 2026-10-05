---
status: resolved
resolution: fix-code
refs:
  - requirements/rules#General
  - requirements/rules#announcement
  - announcement/Preparing
proposal: null
task: iipy46g0
origin: null
option: 1
note: null
created: 2026-10-05T14:31:37.901Z
---
# The announcement of a Proposal rework writes the Proposal's short number into its file

## What happens

Quando il developer chiede di rielaborare la Proposal superata di un Drift con un launcher a terminale, Trama annuncia la nuova Proposal con il titolo «Rework of Proposal P3». Il **numero breve** finisce scritto nel file dell'annuncio, e il ghost lo mostra perché lo legge da lì.

## What should happen

I testi scritti nei file usano sempre l'**identità permanente**, mai il numero breve, che cambia da una copia di lavoro all'altra. Il numero breve si mostra solo nell'interfaccia, dove si nomina una scheda viva.

## Fix options

### Scrivere l'identità, mostrare il numero

Il file dell'annuncio conserva «Rework of Proposal <identità>». Il pannello, quando disegna il ghost, mostra il numero breve al posto dell'identità, come fa per le altre schede vive. Il file rispetta la regola e il ghost resta come oggi. Costo: una piccola sostituzione nel titolo del ghost, solo per questo annuncio.

### Scrivere e mostrare solo l'identità

Il file e il ghost dicono «Rework of Proposal <identità di otto caratteri>». È la correzione più semplice, ma il ghost nomina una Proposal viva senza il suo numero breve, e il developer vede un codice diverso da quello della scheda in To decide.

## Where in the code

`extension/src/host/controller.ts` (`launchAction`, caso `rework-drift`, titolo costruito con `cardName`); `src/core/announcements.ts` (il titolo diventa l'H1 del file).
