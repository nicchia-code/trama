---
column: done
technical: false
refs:
  - proposal/Draft/agent.SUBMIT_PROPOSAL
  - proposal.SUBMITTED
  - design-request/Sent/proposal.SUBMITTED
  - design-request/Consumed
  - requirements/data#proposal
  - requirements/rules#design-request
  - requirements/tech#design-request
drift: null
proposal: a1657b14
agent: false
created: 1970-01-01T00:00:00.148Z
---
# Bind a Proposal to a written design request and consume the request when the Proposal is handed over

Una Proposal può essere legata, quando l'agente la crea, alla richiesta di design scritta da cui nasce: `trama proposal new --request <id>` registra l'ID nel campo `request` della Proposal, che resta anche dopo che la richiesta è stata consumata. Se la richiesta non esiste la Proposal nasce comunque, non legata a nulla, e l'output dice che la richiesta non è stata trovata.

Quando una Proposal legata è consegnata con successo (evento `proposal.SUBMITTED`), il file `.trama/requests/<id>.md` viene cancellato, se esiste ancora, e l'output di `trama proposal submit` lo dice. Una consegna rifiutata non cancella nulla; un file già sparito non fa fallire la consegna; altre Proposal legate alla stessa richiesta consegnano normalmente. Le Proposal scritte prima, senza il campo, restano valide. Non esistono altri comandi per le richieste.
