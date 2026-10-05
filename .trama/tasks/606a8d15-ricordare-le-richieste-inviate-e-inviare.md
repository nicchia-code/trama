---
column: done
technical: false
refs:
  - design-request/Writing/developer.ASK_AGENT
  - design-request/Sent
  - design-request/Sent/workspace.REQUEST_DELETED
  - requirements/data#design-request
  - requirements/rules#design-request
  - requirements/tech#design-request
  - requirements/ui#design-request
drift: null
proposal: 63b9c7df
agent: false
created: 1970-01-01T00:00:00.167Z
---
# Ricordare le richieste inviate e inviare ognuna una sola volta con Send to agent

Trama ricorda quali richieste sono state inviate in un elenco di ID nello stato dell'estensione per l'area di lavoro, che sopravvive ai riavvii; un ID il cui file non esiste più è tolto dall'elenco. Un file in `.trama/requests/` il cui ID non è nell'elenco è una richiesta in Writing.

Fatto quando:
- Send to agent compare (icona `send`, tooltip «Send to agent (closing the tab sends it too)») solo sulle schede delle richieste **mai inviate**;
- Send to agent su un testo vuoto mostra «Trama: write the design request before sending it.» e lascia la scheda aperta;
- altrimenti salva, manda l'istruzione che nomina il file e, **solo se l'istruzione è partita davvero**, segna la richiesta come inviata e chiude la scheda, senza che questa chiusura invii una seconda volta; se il developer annulla (per esempio la richiesta del comando dell'agente) non si segna nulla e la scheda resta aperta;
- con il launcher del terminale l'invio annuncia la Proposal con il titolo della richiesta;
- una richiesta inviata, riaperta, è modificabile ma non si può più inviare: il reinvio di oggi sparisce.
