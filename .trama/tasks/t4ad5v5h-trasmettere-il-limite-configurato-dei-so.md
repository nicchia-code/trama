---
column: done
technical: true
refs:
  - requirements/rules#agent-terminal
  - requirements/rules#agent-launching
  - requirements/tech#agent-launching
  - requirements/ui#agent-launching
  - requirements/quality#agent-launching
drift: null
proposal: o3h29jss
agent: false
created: 2026-10-10T12:54:50.294Z
finished: 2026-10-10T15:28:42.716Z
---
# Trasmettere il limite configurato dei sotto-agenti in ogni istruzione

Il developer dispone dell’impostazione utente trama.maxParallelAgents, numerica, con minimo 1 e valore predefinito 20: un valore vuoto, non intero o minore di 1 vale 20, e le impostazioni del progetto non lo cambiano. La descrizione in inglese chiarisce che limita i sotto-agenti simultanei di scansione, esplorazione del design e corsa di Task e che un agente senza sotto-agenti lo ignora. Ogni invio, sia alla chat sia a omp o Claude Code, legge il limite e aggiunge sulla stessa riga «Run at most N sub-agents at once.», dopo l’istruzione e prima delle eventuali frasi dei sotto-agenti e della lingua. Vale per design rapido e scritto, scansioni manuali e automatiche, implementazione singola, di tutti i Task o di un design, Resolve Drifts e import. Le istruzioni che prelevano gruppi di Task richiedono lo stesso N in trama task next --batch --max N, conservando il filtro della Proposal quando presente. Il limite arriva all’agente soltanto nell’istruzione, senza un’opzione aggiuntiva della sua riga di comando e senza prometterne l’imposizione.
