---
column: done
technical: false
refs:
  - requirements/rules#General
  - requirements/rules#announcement
  - announcement/Preparing
drift: 9zxvrh8h
proposal: null
agent: false
created: 2026-10-05T14:37:36.888Z
---
# Fix code to match the Model: The announcement of a Proposal rework writes the Proposal's short number into its file

## What happens

Quando il developer chiede di rielaborare la Proposal superata di un Drift con un launcher a terminale, Trama annuncia la nuova Proposal con il titolo «Rework of Proposal P3». Il **numero breve** finisce scritto nel file dell'annuncio, e il ghost lo mostra perché lo legge da lì.

## What should happen

I testi scritti nei file usano sempre l'**identità permanente**, mai il numero breve, che cambia da una copia di lavoro all'altra. Il numero breve si mostra solo nell'interfaccia, dove si nomina una scheda viva.

## Chosen option

**Scrivere l'identità, mostrare il numero**

Il file dell'annuncio conserva «Rework of Proposal <identità>». Il pannello, quando disegna il ghost, mostra il numero breve al posto dell'identità, come fa per le altre schede vive. Il file rispetta la regola e il ghost resta come oggi. Costo: una piccola sostituzione nel titolo del ghost, solo per questo annuncio.

## Where in the code

`extension/src/host/controller.ts` (`launchAction`, caso `rework-drift`, titolo costruito con `cardName`); `src/core/announcements.ts` (il titolo diventa l'H1 del file).
