---
status: resolved
resolution: fix-code
refs:
  - design-request/Writing/workspace.REQUEST_DELETED
  - design-request/Sent/workspace.REQUEST_DELETED
  - requirements/rules#design-request
proposal: null
task: 1ov5x1lu
origin: null
option: 1
note: null
resolvedBy: g6eu10uj
created: 2026-10-10T10:53:28.354Z
---
# Restored tab of a vanished design request is closed even with unsaved changes

## What happens

Quando l'editor ripristina dopo un riavvio, o apre più tardi, la scheda di una richiesta il cui file non esiste più, Trama la segna come finita e **chiude subito la scheda, anche se ha modifiche non salvate**.

È proprio il caso di una scheda che alla cancellazione era rimasta aperta perché aveva modifiche: al riavvio quelle modifiche vengono rimesse in gioco dalla chiusura, invece di restare al developer.

## What should happen

Il Model, nelle Transition su `workspace.REQUEST_DELETED` di Writing e di Sent, chiude la scheda solo se è aperta e **non ha modifiche non salvate**.

Il Requisito delle regole lo ripete: dopo la cancellazione la scheda si chiude solo se il documento non ha modifiche non salvate; con modifiche la scheda resta, e quello che il developer ne fa è affare dell'editor. Il Requisito tecnico dice lo stesso per la chiusura dopo la cancellazione del file.

## Fix options

### Chiudere solo le schede senza modifiche

All'avvio, e quando una scheda si apre, Trama chiude le schede di richieste sparite solo se non hanno modifiche; le altre restano aperte, senza salvataggio automatico e senza Send to agent, e il developer decide con l'editor. Costo: se il developer le salva a mano il file torna, e come viene trattato dipende dalla scelta sul Drift dell'elenco delle richieste finite.

### Non chiudere nessuna scheda ripristinata

Trama non chiude più le schede ripristinate di richieste sparite: si limita a non salvarle e a non offrire Send to agent, come per una cancellazione con modifiche nella sessione. Costo: anche le schede pulite di file spariti mentre l'editor era chiuso restano aperte e vanno chiuse a mano.

### Cambiare il Requisito per le schede ripristinate

Il developer apre una Proposal che ammette di chiudere all'avvio anche le schede ripristinate con modifiche di richieste sparite, e il codice resta com'è. Costo: il testo non salvato può andare perso alla chiusura, contro la regola generale che le modifiche non salvate restano all'editor.

## Where in the code

extension/src/host/design-requests.ts: finishMissing, chiamato dal costruttore e da onDidChangeTabs
