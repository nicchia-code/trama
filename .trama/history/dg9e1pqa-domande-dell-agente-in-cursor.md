---
created: 2026-10-18T10:10:10.593Z
updated: 2026-10-18T10:10:10.593Z
summary: Nella chat di Cursor l'agente riceve la riga per usare trama ask, e le domande arrivano all'overlay anche dalla sandbox di Cursor su Linux.
tasks:
  - 0axvc7ty
  - gzjun2q9
---
# Domande dell'agente in Cursor

Due cambiamenti sulle domande che un agente fa con `trama ask`:
- Nella sandbox di Cursor su Linux la cartella dei record di discovery usa `CURSOR_ORIG_UID`, così la riga di comando trova l'editor. Fuori dalla sandbox, e su macOS e Windows, nulla cambia.
- La chat di Cursor riceve la riga «Ask the developer only with `trama ask`, as the skill says.» nei lavori che fanno domande: design da richiesta scritta, setup, import e Resolve Drifts manuale. Scan, implement e Resolve Drifts automatico non la ricevono.
Le skill di design, import e Resolve Drifts indicano `trama ask` come strumento per le domande, e `AskQuestion` di Cursor solo come ultima risorsa.
