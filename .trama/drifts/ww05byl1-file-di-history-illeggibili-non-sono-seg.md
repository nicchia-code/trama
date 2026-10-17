---
status: resolved
resolution: fix-code
refs:
  - voce-history
proposal: null
task: mkg7gj9z
origin: null
critical: false
option: 1
note: null
resolvedBy: uw0a9dir
created: 2026-10-17T11:40:57.579Z
---
# File di History illeggibili non sono segnalati come errori della Snapshot

## What happens

La Snapshot legge le voci di .trama/history/ e mette i file che non si leggono in historyFaults, che non è in diagnostics: nessun pannello li mostra, e il file sbagliato sparisce dalla colonna senza che nessuno lo sappia (anche trama history list lo dice solo in CLI).

## What should happen

Un file di History che non si legge è segnalato come errore della Snapshot, e la colonna mostra le altre voci (requirements/data#voce-history: "un file che non si legge è segnalato come errore della Snapshot").

## Fix options

### Mettere i fault in diagnostics

Aggiungere ogni HistoryFault a project.diagnostics della Snapshot (come le altre voci della Snapshot con errori), così il pannello li mostra nel box degli errori e la colonna resta piena per le voci buone.

### Mostrare historyFaults nel pannello

Lasciare il campo historyFaults e mostrarlo in un box dedicato nella colonna History, con il file e il messaggio di ogni fault.

## Where in the code

src/core/snapshot.ts, riga 454: historyFaults: history.faults; riga 386: diagnostics: project.diagnostics, che non include i fault della History
