---
refs:
  - panel/Board
  - requirements/ui#panel/Board
  - requirements/tech#panel
  - requirements/ui#drift-resolution
  - requirements/ui#design-request
---
# Barra della Board senza Add Work Item… e Run Ready Tasks

Quando il Task è finito:

- La barra della Board non ha più i pulsanti `Add Work Item…` e `Run Ready Tasks`. Contiene, in quest'ordine, `Resolve Drifts`, `Scan System` e `Quick request…`, e nessuno di loro è pieno nel colore primario.
- `+ Work Item`, in fondo alla colonna Work Items, è l'unico pulsante della Board che apre una nuova richiesta di design scritta: manda `writeDesignRequest`, con tooltip «Write a work item in Markdown and send it to an agent» e nome accessibile `Add Work Item`, anche a colonna vuota.
- `Run all`, in fondo alla colonna Ready, è l'unico pulsante della Board che chiede all'agente di realizzare tutti i Task in To do (Run Ready Tasks): manda il lancio di tutti i Task in To do, è disabilitato in tutti i casi e con tutti i motivi, nel tooltip e nella descrizione accessibile, che valevano per il pulsante della barra (Task preso dall'agente, tutti i Task bloccati, nessun Task Ready, Drift in risoluzione, Run in corso con `trama.submitWhileRunning` spento), nello stesso ordine. Da abilitato tooltip e nome accessibile sono `Run Ready Tasks`. È pieno nel colore primario, con icona `play`.
- Il nome del Run resta Run Ready Tasks dove non si parla di un pulsante della barra: rifiuto dell'host, descrizione di `trama.submitWhileRunning`, titoli dei controlli e avvio di Run Ready Tasks dopo una Proposal di setup approvata non cambiano.
- La documentazione del progetto (`extension/README.md`) non nomina più `Add Work Item…` né `Run Ready Tasks` come pulsanti della barra della Board.
