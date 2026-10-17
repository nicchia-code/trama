---
technical: false
refs:
  - agent-launching
  - design-request
  - requirements/data#design-request
  - requirements/rules#design-request
  - requirements/tech#design-request
  - requirements/ui#design-request
---
# Pulsante Design… rinominato Add Work Item…

Il pulsante della barra della Board che apriva la richiesta di design scritta si chiama `Add Work Item…` (con il carattere ellissi) e ha il tooltip «Write a work item in Markdown and send it to an agent». Il comportamento non cambia: crea subito il file vuoto della richiesta in `.trama/requests/` e lo apre in una scheda dell'editor, come prima; Quick request… e la casella «Quick Design Request» restano come sono.

La richiesta di design scritta nasce ora da `Add Work Item…` nella barra o da `+ Work Item` in fondo alla colonna Work Items: i due pulsanti fanno la stessa cosa. Nessun comando di palette apre una richiesta di design: i Requisiti non chiedono più «Trama: Quick Design Request…» né «Trama: Design…».

Aggiornare i nomi dei test e la documentazione che nominano il pulsante `Design…` (`README.md`, `extension/README.md`, `docs/model-format.md`, `docs/uat.md`, `CHANGELOG.md`), togliendo dalla documentazione i comandi di palette per le richieste di design dove li promette.
