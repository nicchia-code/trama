---
column: done
technical: false
refs:
  - design-request/Writing/workspace.REQUEST_DELETED
  - design-request/Sent/workspace.REQUEST_DELETED
  - requirements/tech#design-request
  - requirements/data#design-request
drift: null
proposal: null
agent: false
created: 2026-10-06T15:26:48.600Z
finished: 2026-10-06T15:29:05.555Z
---
# Chiudere le richieste anche quando sparisce la loro cartella

Oggi la cancellazione da fuori è riconosciuta solo quando l'osservatore segnala il file della singola richiesta. Se sparisce l'intera cartella `.trama/requests/` (o `.trama/`), per esempio con una pulizia dei file ignorati, l'editor segnala di solito solo la cartella: la scheda della richiesta resta aperta, in Writing continua a mostrare Send to agent e l'ID inviato resta nell'elenco fino al riavvio.

Fatto quando: cancellare la cartella che contiene una o più richieste porta ognuna in Abandoned (se mai inviata) o Consumed (se inviata), come la cancellazione del singolo file: le schede senza modifiche non salvate si chiudono, quelle con modifiche restano all'editor, e gli ID delle richieste sparite escono dall'elenco degli inviati.
