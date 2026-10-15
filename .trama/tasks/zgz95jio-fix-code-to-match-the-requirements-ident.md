---
column: done
technical: true
refs:
  - requirements/ui#General
drift: null
proposal: null
agent: false
created: 2026-10-14T10:25:21.607Z
finished: 2026-10-14T12:09:24.517Z
---
# Fix code to match the Requirements: Identity rewrite names rewritten cards by permanent identity even when they have a short number (technical)

Il messaggio di trama ids rewrite nomina ogni scheda riscritta con la sua identità permanente nuova, anche quando la scheda è viva e ha già un numero breve (T3, P3, D3) assegnato subito dopo la riscrittura. Quando una scheda riscritta ha un numero breve, il messaggio lo mostra al suo posto, senza accostarci l'identità; una scheda chiusa, che non ha numero, mostra la sua identità permanente. Il dato resta quello di prima nel risultato JSON, che porta l'identità nuova in ogni caso. Fatto quando ogni riga del messaggio di riscrittura segue questa regola, per ciascun tipo di scheda.
