---
column: done
technical: false
refs:
  - drift-resolution/Running tasks/time.QUIET_PERIOD_ELAPSED
  - drift-resolution/Resolving/time.QUIET_PERIOD_ELAPSED
  - requirements/rules#drift-resolution
  - requirements/tech#announcement
drift: null
proposal: null
agent: false
created: 2026-10-10T10:18:50.277Z
finished: 2026-10-10T10:38:44.159Z
---
# Restart the shared quiet of non-Cursor chat jobs on read-only trama commands too

Un Run o un Resolve Drifts lanciato nella chat di un editor che non è Cursor resta in corso finché in quindici minuti arriva almeno un comando di `trama`, anche di sola lettura, chiunque lo esegua: l'agente della chat, il developer o un agente avviato senza Trama. Oggi un comando che legge soltanto, lanciato fuori da un terminale di Trama e fuori dalla chat di Cursor, non arriva all'editor, quindi un agente della chat che legge soltanto è dato per finito dopo quindici minuti e i Run tornano liberi mentre la risoluzione lavora ancora (o viceversa).

Quando è fatto:
- un comando di `trama` di sola lettura riuscito, senza terminale di Trama né chat di Cursor, è riferito all'editor del progetto come attività senza origine; senza editor non succede nulla e il comando non fallisce;
- quell'attività fa ripartire la quiete condivisa dei lavori nella chat di un editor che non è Cursor;
- non conta per gli annunci, per i Task presi, né per i lavori in un terminale o nella chat di Cursor.
