---
column: done
technical: true
refs:
  - requirements/tech#design-request
  - requirements/rules#design-request
drift: null
proposal: null
agent: false
created: 1970-01-01T00:00:00.153Z
---
# Teach trama-design to work from a written design request

La skill `trama-design` distribuita con Trama (e quindi quelle installate nei progetti con l'aggiornamento delle skill) descrive la richiesta scritta: quando l'istruzione nomina un file in `.trama/requests/`, l'agente lo legge tutto prima di esplorare il Model e lo usa come punto di partenza dell'intervista, che resta completa: ogni decisione della richiesta diventa comunque una domanda con le sue opzioni, con come raccomandazione quella che la richiesta indica. Passa `--request <id>` solo alla prima `trama proposal new` del design, non a quelle che la seguono con `--requires`. Se il file non esiste più lo dice al developer e si ferma senza aprire Proposal.
