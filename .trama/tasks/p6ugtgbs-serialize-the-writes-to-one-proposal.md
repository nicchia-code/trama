---
column: done
technical: false
refs:
  - proposal/Draft/agent.EDIT_PROPOSAL
  - proposal/Open/agent.EDIT_PROPOSAL
  - requirements/tech#proposal
drift: null
proposal: 2pa6eli4
agent: false
created: 2026-10-14T08:39:18.089Z
finished: 2026-10-14T09:55:55.346Z
---
# Serialize the writes to one Proposal

Più agenti, per esempio sotto-agenti che scrivono ciascuno i Task di una Machine, possono registrare file della stessa Proposal nello stesso momento senza perdere nulla di ciò che un altro ha scritto.

- Le registrazioni sulla stessa Proposal si mettono in fila, una alla volta.
- Ogni registrazione riporta la Proposal in Draft, come oggi.
- Nessun Task scritto da un agente sparisce perché un altro agente ha registrato un file nello stesso momento.
