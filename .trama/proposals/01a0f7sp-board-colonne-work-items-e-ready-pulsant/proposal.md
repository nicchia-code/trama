---
status: approved
base:
  editor-panel/panel.md: be7081569066f157553807cb46281baa512fa0a60e53e88c0a938ffa50dc21a5
  work/announcement.md: 42dd7721e904b59a89e9b73cc6ef5a042ba84ac3731b520482fe83d74bdc25ad
  agent-launching/design-request.md: a37ed606ab69751ffc420108554fa30ebdbb413f9532d12f7b27ec1f73a093df
  agent-launching/feature.md: dc4df577f5fab687f5fa5d6ad06cded21f3fadbf7ca5db8fee67201dd36c936e
  requirements/ui/board.md: 50ba0f28825eb24588f1103f1824ed9fb6eaaeb8b9a9e8d5d025d229c1975448
  requirements/ui/agents.md: a11e92061ac179ebfbec24ee0a005119ce7d7d1793262461dfd51146da56e0c2
  requirements/ui/work.md: aff0e625bc79992e6b6ddae6e8daa97032a3a3a5002b0e522bed7dc4beb98277
  requirements/ui/tasks.md: 60c600855595e062fc97202f7dc3b771c3b360c4ea6d048722fa1c8bde10d09e
  requirements/data/work.md: 0ed4429bd6a77210c50e8ecfd13f79cfbe5fe3ef1d7b61585ebdc45a523d7c32
  requirements/data/agents.md: 79b8f07f9f2ad381a326badd9006ea517ce995cd24c6a5109abcd24cc19086f8
  requirements/tech/requests.md: 1fdd2e65fc7ec81c2157b12af8f513dfe846950f67667fcd91d5e031fe46c12f
  requirements/tech/project-panel.md: dc7daee1d7cbfcf0e6fd472a5a5a3f7ae5992f82e17032dcf7632df8ca37ea44
  requirements/rules/announcements.md: 1e314a5b430707e8f503e1fed29e957ee0b5efcc54da24dbd544ebb095bbd417
  requirements/rules/tasks.md: 580bc350ddeca62cee41440a8de9fb4eb0c76631aeb45f96e67a62b80fd44781
  requirements/rules/requests.md: c86f9705d56bd89058215cfc25451b9fd7b7cf7d6cf15191a541b64bb0f01e72
delete: []
request: 2026-10-16T11-27-29
created: 2026-10-16T09:40:01.022Z
---
# Board: colonne Work Items e Ready, pulsanti in colonna

Perché: la Board deve parlare di Work Items e Ready invece di To decide e To do, e offrire i due lavori più frequenti (scrivere un nuovo Work Item, realizzare i Task pronti) direttamente in fondo alle colonne, con un aspetto curato.

Decisioni prese nell'intervista:
- La rinomina riguarda solo il pannello: lo State `task/To do`, l'Event `MOVE_TASK_TO_TODO`, i valori dei dati (`todo`, `decide`) e l'uscita della CLI non cambiano.
- La colonna To decide si chiama `Work Items` e la colonna To do si chiama `Ready`, ovunque il Modello e i Requisiti nominano una colonna della Board; dove `To do` è lo State del Task resta com'è.
- Le colonne vuote dicono `No work items` e `Nothing ready`.
- In fondo a Work Items, dopo schede e ghost, c'è sempre il pulsante `+ Work Item`, che apre la richiesta di design scritta come il pulsante della barra.
- In fondo a Ready, dopo schede e ghost, c'è sempre il pulsante `Run all`, con le stesse regole di disabilitazione e lo stesso lancio del pulsante della barra.
- Il pulsante `Run all To do` della barra resta e si chiama `Run Ready Tasks`.
- Il pulsante `Design…` si chiama `Add Work Item…` (carattere ellissi), con tooltip «Write a work item in Markdown and send it to an agent»; nessun cambio di funzionalità.
- I pulsanti in colonna hanno tooltip e nome accessibile del pulsante gemello della barra.
- I due pulsanti in colonna sono larghi quanto la colonna, con icona SVG: `+ Work Item` con bordo tratteggiato e icona `add`, `Run all` pieno nel colore primario con icona `play`.
- Nel pannello i motivi di blocco dicono «No Task is Ready» e «All the Ready Tasks are blocked: …»; la CLI tiene i suoi testi.
- I Requisiti non chiedono più comandi di palette per le richieste di design.
- `Quick request…` e la casella «Quick Design Request» restano come sono.
- I Requisiti descrivono `trama.submitWhileRunning` come l'interruttore booleano che esiste nel codice (spento per impostazione predefinita), non più come scelta fra `disabled` ed `enabled`; la sua descrizione nomina `Run Ready Tasks`.

## Already present
- `announcement` — `extension/src/webview/board/logic.ts` (`announcedGhosts`: ghost di Proposal e Drift nella colonna `decide`, di Task in `todo`, di controlli in `doing`; i nomi mostrati li cambia il Task della Board)
- `requirements/rules#announcement` — `extension/src/webview/board/logic.ts` e `src/core` degli annunci (colonna del ghost per tipo; titoli dei controlli invariati)
