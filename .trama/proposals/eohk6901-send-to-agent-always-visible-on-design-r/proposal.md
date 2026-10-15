---
status: rejected
base:
  requirements/ui/agents.md: 0210ce308fd31f943f3936e114a5ed63ae4f2dbd6f3e1c14ea3d375125596682
  requirements/ui/panel.md: 76f2b0551793a99022fc39b06b13e067623642028b8676426978899c05bf347c
  requirements/tech/requests.md: 6fa847e441b511d35bdb38054952c3ed64d9ad6134c0e7c0a8d7e476e812282f
  requirements/tech/project-panel.md: 8e7100c083ec9cdc417b60fb97e1d2311c28bdbd32add8df7bebddd857bec502
delete: []
created: 2026-10-14T06:31:47.783Z
---
# Send to agent always visible on design request tabs

Send to agent finisce nel menu … della scheda: l'editor mostra al massimo 9 azioni nella barra e Send to agent, con ordine @1, viene dopo le icone di tutte le altre estensioni.

- Send to agent diventa la prima icona a sinistra della barra della scheda, con un ordine negativo, e non finisce più nel menu ….
- In più una CodeLens «Send to agent» con l'icona send sopra la prima riga del documento, solo sulle richieste mai inviate.
- La CodeLens segue l'impostazione delle CodeLens dell'editor: se sono spente resta solo l'icona.
- Open Trama resta dov'è: dopo le icone delle altre estensioni, e può finire nel menu ….

## Feedback

Diventata stale dopo l'approvazione di 'Tasks born with the Proposal, pre-flight' che ha cambiato gli stessi frammenti (ui/panel, tech/project-panel). Da rifare su base aggiornata se serve ancora.
