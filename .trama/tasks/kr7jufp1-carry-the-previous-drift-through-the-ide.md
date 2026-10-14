---
column: done
technical: true
refs:
  - requirements/data#drift
drift: null
proposal: null
agent: false
created: 2026-10-12T19:55:01.805Z
finished: 2026-10-13T05:08:05.952Z
---
# Carry the previous Drift through the identity rewrite

Quando `trama ids rewrite` assegna l'identità nuova a un Drift numerato, il Drift precedente di cui un Drift ricorrente è il seguito deve restare collegato: il campo di precedenza di ogni Drift ricorrente va riscritto con l'identità nuova del Drift che segue, come già accade per il Task di origine, la Proposal di risoluzione e il Task di correzione. Oggi il campo non viene riscritto, e il seguito resta puntato a un numero che non esiste più. Fatto quando, dopo la riscrittura, ogni Drift ricorrente nomina il Drift precedente con la sua identità nuova e la catena si legge ancora nella Board, nel Diagramma e nei comandi `drift show` e `drift list`.
