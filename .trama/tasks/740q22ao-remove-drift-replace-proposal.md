---
column: done
technical: false
refs:
  - drift/Open
  - requirements/rules#drift
  - requirements/tech#drift
drift: null
proposal: hlnh5d44
agent: false
created: 2026-10-09T07:12:35.277Z
finished: 2026-10-09T08:22:48.276Z
---
# Remove drift replace-proposal

Il rifacimento della Proposal obsoleta di un Drift non esiste più, ma `trama drift replace-proposal` è ancora un comando: allega una Proposal nuova al Drift e rifiuta quella obsoleta con «Replaced by Proposal <id>».

Quando è fatto:
- `trama drift replace-proposal` non esiste più, e con lui la logica che sostituisce la Proposal allegata e verifica che quella vecchia sia aperta e obsoleta.
- Una Proposal allegata obsoleta resta com'è finché il Drift non è risolto: nessun comando la sostituisce.
- La skill `trama-design` non ha più le istruzioni per rifare la Proposal obsoleta di un Drift, e la documentazione della riga di comando non elenca più il comando.

Non fa parte di questo Task il lancio dell'agente per il rifacimento dal pannello né l'annuncio e il ghost del rifacimento.
