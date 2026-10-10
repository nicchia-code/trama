---
column: done
technical: false
refs:
  - drift-resolution/Resolving/time.QUIET_PERIOD_ELAPSED
  - drift-resolution/Running tasks/time.QUIET_PERIOD_ELAPSED
  - requirements/rules#drift-resolution
drift: null
proposal: null
agent: false
created: 2026-10-09T08:41:46.182Z
finished: 2026-10-09T09:26:16.087Z
---
# Count recorded Drift decisions as agent activity in the quiet period of a run

Per un lavoro di cui Trama non vede la fine con certezza (finestra del terminale esterno, terminale integrato senza fine dei comandi, chat di un editor che non è Cursor) i quindici minuti di quiete ripartono a ogni comando di trama dell'agente che cambia qualcosa. Il Requisito conta fra questi anche la decisione registrata su un Drift in una Proposal di risoluzione, ma oggi registrarla (trama proposal resolve-drift, anche con --remove) non conta come attività: un agente di Resolve Drifts che dopo il round di domande registra le decisioni una per una può essere considerato finito mentre lavora ancora, e i Run tornano lanciabili.

Quando è fatto: registrare, sostituire o togliere la decisione su un Drift in una Proposal di risoluzione, dal terminale o dalla chat dell'agente, fa ripartire i quindici minuti del suo lavoro, come già fanno annunci, Proposal nuove, file registrati, consegne, Drift e Task archiviati e Task spostati.
