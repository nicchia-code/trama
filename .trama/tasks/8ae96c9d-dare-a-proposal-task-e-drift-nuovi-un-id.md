---
column: done
technical: false
refs:
  - proposal/Draft
  - task/To do
  - drift/Open
  - requirements/data#General
  - requirements/data#proposal
  - requirements/data#task
  - requirements/data#drift
drift: null
proposal: 5da64246
agent: false
created: 1970-01-01T00:00:00.181Z
---
# Dare a Proposal, Task e Drift nuovi un'identità propria e l'istante di creazione

Una Proposal, un Task o un Drift nuovo non prende il numero successivo di un contatore condiviso. Nasce con un'identità propria e ricorda quando è stato creato.

Fatto quando:
- L'identità è di otto caratteri, lettere minuscole e cifre, estratta a caso. Se in questa cartella una scheda dello stesso tipo la usa già, se ne estrae un'altra. Un Task e una Proposal possono avere la stessa stringa.
- Il file, o la cartella per una Proposal, si chiama con quell'identità e lo slug del titolo, come oggi.
- Nel front matter c'è `created`, l'istante di creazione in UTC come data e ora ISO 8601.
- Una scheda il cui nome è ancora `NNNN-<slug>`, con almeno quattro cifre, resta leggibile: la sua identità è quel numero e non ha `created`.
- I riferimenti fra schede accettano sia il numero sia l'identità di otto caratteri: le Proposal richieste, la Proposal di un Task, il Drift di un Task, la Proposal di un Drift, il Task nato dal Drift e il Task di origine.
