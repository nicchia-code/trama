---
status: discarded
base:
  requirements/rules/prenotazioni.md: ae1e848d3eff308cd33bfd305fc144a0da1a6b3cbbc1405d7626b510a20f7fe8
delete: []
created: 2026-10-24T08:40:22.007Z
---
# Conflitto di prenotazione: nessuna registrazione

Alternativa alla correzione del codice per il Drift D1 `snjzl3et`. Cambia `requirements/rules/prenotazioni.md`: toglie dalla regola del sotto-agente fermato da una prenotazione la frase che chiede di registrare il conflitto con `trama timing new` (`kind: conflict`) con Parallel Execution attivo. Il Modello e i Requisiti dicono allora che il blocco ferma la scrittura senza registrazione del conflitto.

Perché: la registrazione richiede che l'hook riceva dall'host il Task del terminale e l'impostazione Parallel Execution e che la prenotazione salvi il Task del titolare. Questa Proposal evita quel lavoro al costo di non registrare i conflitti di prenotazione, che la regola attuale chiede di registrare. Va scelta solo se il developer rinuncia a quella registrazione.
