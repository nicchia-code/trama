---
technical: true
refs:
  - requirements/rules#agent-launching
  - requirements/tech#agent-launching
---
# Ruoli dei modelli e sotto-agenti di confronto senza le istruzioni tolte

Quando il Task è finito, la scelta del ruolo del modello per istruzione è: written design request, Resolve Drifts (con `Resolve all` o con `Resolve` su un solo Drift) e import → `trama.analysis`; scan del System e scan di Feature → `trama.scan`; implement, implement all e il Run automatico → `trama.execution`, con `trama.scan` per i sotto-agenti che confrontano le Machine nel pre-flight e nel controllo mirato. Non c'è più un ruolo per la quick design request né per implement a design: i rami che li mappano vanno tolti.

Il modello del sotto-agente di confronto `trama-analysis` (`--slow` per `omp`, `--agents` per `claude`, definizione utente per la chat di Cursor) si passa solo alle istruzioni che possono scansionare: scan di ogni tipo, implement e implement all. Nessun caso residuo per implement a design.

Aggiornare i test dei ruoli e delle righe di comando di conseguenza.
