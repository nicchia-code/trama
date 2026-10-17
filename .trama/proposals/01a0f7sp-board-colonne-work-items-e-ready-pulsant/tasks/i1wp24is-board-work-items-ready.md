---
technical: false
refs:
  - panel/Board
  - panel/Open/developer.SHOW_BOARD
  - requirements/ui#panel/Board
  - requirements/tech#panel
  - requirements/data#task
  - requirements/ui#proposal
  - requirements/ui#drift
  - requirements/ui#drift-resolution
  - requirements/rules#task
  - requirements/ui#agent-terminal
  - requirements/ui#agent-launching
---
# Board: colonne Work Items e Ready, pulsanti in colonna e Run Ready Tasks

Quando il developer mostra la Board, le colonne si intitolano `Work Items`, `Ready`, `In progress` e `Done`; vuote, `Work Items` dice `No work items` e `Ready` dice `Nothing ready`. Ciò che ciascuna colonna contiene, l'ordine, i conteggi e i ghost non cambiano: cambiano solo i nomi mostrati nel pannello. Lo State `To do` del Task, le chiavi interne delle colonne, l'Event `MOVE_TASK_TO_TODO` e l'uscita della CLI (`trama board`, `trama task`) restano come sono.

Il pulsante della barra `Run all To do` si chiama `Run Ready Tasks`, con tutte le regole di disabilitazione e i motivi di prima; anche i messaggi dell'host che lo nominano (per esempio «… is unavailable: …») e la descrizione dell'interruttore `trama.submitWhileRunning`, che resta booleano, dicono `Run Ready Tasks`, con il testo dei Requisiti.

In fondo a `Work Items` e a `Ready`, dopo le schede e i ghost, sempre presenti anche a colonna vuota sotto il testo di colonna vuota, ci sono due pulsanti larghi quanto la colonna, con l'icona SVG inline a sinistra del testo e i colori del tema:
- `+ Work Item`, con bordo tratteggiato, sfondo trasparente e icona `add`: manda lo stesso `writeDesignRequest` di `Add Work Item…` e ha il suo tooltip, «Write a work item in Markdown and send it to an agent»; nome accessibile `Add Work Item`.
- `Run all`, pieno nel colore primario con icona `play`: manda lo stesso lancio di `Run Ready Tasks`, è disabilitato negli stessi casi con gli stessi motivi nel tooltip e nella descrizione accessibile, e da abilitato ha tooltip e nome accessibile `Run Ready Tasks`.

Le icone `add` e `play` sono SVG ricavati dai glifi codicon come l'icona `package` delle Specs, con la licenza in `extension/THIRD-PARTY-NOTICES.md`; nessun font di icone. Nel pannello i motivi del core «No Task is in To do» e «All the Tasks in To do are blocked: …» si leggono «No Task is Ready» e «All the Ready Tasks are blocked: …», con il resto del testo uguale; la CLI tiene i testi originali.

Aggiornare i test della Board che fissano titoli, testi vuoti e nomi dei pulsanti, e la documentazione che nomina le colonne o `Run all To do` per il pannello (`README.md`, `extension/README.md`, `docs/uat.md`, `CHANGELOG.md`).
