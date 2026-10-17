---
status: approved
kind: resolution
drifts:
  - drift: 1vb6oj65
    decision: fix-code
    option: 1
  - drift: eetk8uod
    decision: proposal
  - drift: 0jrshahm
    decision: fix-code
    option: 1
base:
  requirements/tech/agent-terminal.md: ccf42b9cc8cf95f7d1587241c94f90fb7528f44719293b8d379c01d0c19bc004
delete: []
created: 2026-10-17T11:36:01.222Z
---
# Resolve Drifts: setup cleanup, submitWhileRunning, Copilot turn hold

Risoluzione di tre Drift, secondo le scelte del developer:

- Drift 1vb6oj65 – Elenco dei setup non ripulito all'avvio: si corregge il codice (opzione 1, ripulire all'avvio senza avviare nulla). All'avvio le richieste di setup senza più file escono dall'elenco e i Task restano in To do, da avviare dalla Board.
- Drift eetk8uod – Il Requisito tecnico descrive trama.submitWhileRunning come stringa enabled/disabled, il codice la tratta come interruttore: si adeguano i Requisiti. L'impostazione resta un interruttore booleano spento per impostazione predefinita, e il Requisito tecnico agent-terminal lo dice.
- Drift 0jrshahm – Dismiss Drift sui Drift archiviati in Copilot non attende la fine del turno: si corregge il codice (opzione 1, trattenere nella finestra della conversazione). Il Drift archiviato in una conversazione Copilot resta trattenuto nella finestra dove la conversazione è in corso, fino alla fine del turno.
