---
column: done
technical: true
refs:
  - requirements/tech#agent-launching
  - requirements/quality#task
drift: null
proposal: null
agent: false
created: 2026-10-10T09:25:14.340Z
finished: 2026-10-10T09:46:46.615Z
---
# Queue classify calls to Jev at four at a time

L'host dell'estensione lascia passare al massimo quattro chiamate `trama classify` contemporanee a Jev, per tutte le scansioni della finestra dell'editor. Le richieste in più aspettano in coda nell'host, in ordine di arrivo, e partono appena una chiamata in corso finisce. Il tempo passato in coda conta nei 15 secondi che `trama classify` aspetta l'editor: una richiesta che scade mentre è in coda risponde `unavailable` e il triage usa la vista completa della Machine. Oggi ogni richiesta chiama Jev subito, senza limite. Fatto quando: con più di quattro triage insieme non ci sono mai più di quattro chiamate a Jev in corso, le altre partono in ordine man mano che si liberano posti, e un test lo verifica.
