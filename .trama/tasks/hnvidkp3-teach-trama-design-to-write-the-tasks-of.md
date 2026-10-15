---
column: done
technical: false
refs:
  - proposal/Draft/agent.SUBMIT_PROPOSAL
  - requirements/tech#proposal
  - requirements/rules#proposal
drift: null
proposal: 2pa6eli4
agent: false
created: 2026-10-14T08:39:20.774Z
finished: 2026-10-14T10:00:55.269Z
---
# Teach trama-design to write the Tasks of a Proposal and to scan lightly before hand-over

Il design scrive i Task della Proposal insieme ai suoi file, dopo l'intervista e la scrittura del Modello e dei Requisiti.

- Divide lo scope della Proposal per Machine, così nessun riferimento ha due Task.
- Dà ogni Machine a un sotto-agente, al massimo N insieme, che scrive i Task dei propri riferimenti; le voci che non appartengono a una Machine, come i General o le descrizioni di Feature, restano all'agente principale.
- Ciò che l'esplorazione ha già visto implementato va nella sezione `## Already present`, non in un Task.
- Prima di consegnare fa uno scan leggero del codice solo sulle voci che l'esplorazione non ha visto. Se trova codice che contraddice il Modello apre un nuovo round di domande, aggiorna Proposal e Task e ripete la validazione.
- Non archivia mai Drift, non si annuncia come controllo e non entra nella barriera dell'autopilota.
