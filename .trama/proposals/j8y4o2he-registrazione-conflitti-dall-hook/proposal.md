---
status: approved
kind: resolution
prepared: true
drifts:
  - drift: snjzl3et
    decision: fix-code
    option: 1
base: {}
delete: []
created: 2026-10-24T08:51:34.986Z
label: Registrazione conflitti hook
---
# Registrazione conflitti dall'hook

# Registrazione conflitti dall'hook

Risolto il Drift snjzl3et (Conflitto di prenotazione non registrato): correzione del codice, opzione 1 (Registrare dall'hook).

Con Parallel Execution attiva, il sotto-agente fermato da una prenotazione registra il conflitto con trama timing new (kind: conflict) nel momento del blocco. L'host passa all'hook, per variabile d'ambiente, il Task del terminale e l'impostazione Parallel Execution; la prenotazione salva il Task del titolare.
