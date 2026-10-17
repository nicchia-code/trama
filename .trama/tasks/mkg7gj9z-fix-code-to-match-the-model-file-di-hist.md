---
column: done
technical: false
refs:
  - voce-history
drift: ww05byl1
proposal: null
agent: false
created: 2026-10-17T12:11:32.202Z
finished: 2026-10-17T13:05:12.074Z
---
# Fix code to match the Model: File di History illeggibili non sono segnalati come errori della Snapshot

## What happens

La Snapshot legge le voci di .trama/history/ e mette i file che non si leggono in historyFaults, che non è in diagnostics: nessun pannello li mostra, e il file sbagliato sparisce dalla colonna senza che nessuno lo sappia (anche trama history list lo dice solo in CLI).

## What should happen

Un file di History che non si legge è segnalato come errore della Snapshot, e la colonna mostra le altre voci (requirements/data#voce-history: "un file che non si legge è segnalato come errore della Snapshot").

## Chosen option

**Mettere i fault in diagnostics**

Aggiungere ogni HistoryFault a project.diagnostics della Snapshot (come le altre voci della Snapshot con errori), così il pannello li mostra nel box degli errori e la colonna resta piena per le voci buone.

## Where in the code

src/core/snapshot.ts, riga 454: historyFaults: history.faults; riga 386: diagnostics: project.diagnostics, che non include i fault della History
