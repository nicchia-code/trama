---
column: done
technical: false
refs:
  - proposal/Draft/agent.SUBMIT_PROPOSAL
  - requirements/rules#proposal
  - requirements/rules#project
drift: null
proposal: euf9nx59
agent: false
created: 2026-10-05T13:21:55.337Z
---
# Avvisare dei frammenti troppo grandi e del cambio di modalità in validate e analyze

`trama validate` riporta, oltre agli errori, avvisi che non bloccano né la validazione né la consegna di una Proposal:
- ogni frammento più grande di 12 KB (12.288 byte del file, front matter compreso), con percorso e dimensione;
- con una Proposal, il passaggio da skill per frammento a skill indice, o il ritorno, che la Proposal causerebbe una volta applicata.

Gli avvisi sono scritti separati dagli errori e il codice di uscita dipende solo dagli errori; lo stesso vale per la validazione fatta da `trama proposal submit`. Anche `trama analyze` riporta, insieme agli altri avvisi, ogni frammento oltre 12 KB con percorso e dimensione.
