---
status: approved
kind: resolution
drifts:
  - drift: 8jxft5i3
    decision: proposal
  - drift: w200qrg2
    decision: fix-code
    option: 1
base:
  agent-launching/agent-terminal.md: 23f5e06b2ab328ba0e0032801fa8b6cb475cbd0941750a798b845d8381770247
  requirements/rules/agent-terminal.md: 4c8e130524b7d6f3a9c0bd93cd5baa0b6f5f766a3157f0a2ed3a79c853a59cc9
  requirements/ui/agents.md: c9018edfbe857638ec4acee63d39dfccdc4698c19907f0f137e424d8e7155678
delete: []
created: 2026-10-09T12:14:10.936Z
---
# Resolve design run terminal name and blocked fix-code resolutions

Questa risoluzione decide due Drift:

- Drift 8jxft5i3 – Design run terminal named with the Proposal identity instead of its short number: il Modello e i Requisiti si adeguano al codice. Il terminale di Run this design porta l'identità permanente della Proposal, perché una Proposal approvata non ha più un numero breve.
- Drift w200qrg2 – Approving a resolution can leave it approved with its Drifts still open: si corregge il codice con l'opzione «Block the resolution while a fix cannot be applied». Una risoluzione resta bloccata finché la correzione di un suo Drift non si può applicare, così l'approvazione non si ferma mai a metà.
