---
column: done
technical: false
refs:
  - design-request/Writing/workspace.REQUEST_DELETED
  - design-request/Sent/workspace.REQUEST_DELETED
  - requirements/rules#design-request
drift: shuwd177
proposal: null
agent: false
created: 2026-10-10T11:14:40.601Z
finished: 2026-10-10T11:18:33.580Z
---
# Fix code to match the Model: Restored tab of a vanished design request is closed even with unsaved changes

## What happens

Quando l'editor ripristina dopo un riavvio, o apre più tardi, la scheda di una richiesta il cui file non esiste più, Trama la segna come finita e **chiude subito la scheda, anche se ha modifiche non salvate**.

È proprio il caso di una scheda che alla cancellazione era rimasta aperta perché aveva modifiche: al riavvio quelle modifiche vengono rimesse in gioco dalla chiusura, invece di restare al developer.

## What should happen

Il Model, nelle Transition su `workspace.REQUEST_DELETED` di Writing e di Sent, chiude la scheda solo se è aperta e **non ha modifiche non salvate**.

Il Requisito delle regole lo ripete: dopo la cancellazione la scheda si chiude solo se il documento non ha modifiche non salvate; con modifiche la scheda resta, e quello che il developer ne fa è affare dell'editor. Il Requisito tecnico dice lo stesso per la chiusura dopo la cancellazione del file.

## Chosen option

**Chiudere solo le schede senza modifiche**

All'avvio, e quando una scheda si apre, Trama chiude le schede di richieste sparite solo se non hanno modifiche; le altre restano aperte, senza salvataggio automatico e senza Send to agent, e il developer decide con l'editor. Costo: se il developer le salva a mano il file torna, e come viene trattato dipende dalla scelta sul Drift dell'elenco delle richieste finite.

## Where in the code

extension/src/host/design-requests.ts: finishMissing, chiamato dal costruttore e da onDidChangeTabs
