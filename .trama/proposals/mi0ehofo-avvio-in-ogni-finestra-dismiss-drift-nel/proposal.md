---
status: approved
kind: resolution
drifts:
  - drift: jszvs0k1
    decision: proposal
  - drift: dp17fs43
    decision: proposal
  - drift: crtz08k3
    decision: proposal
base:
  requirements/tech/project-panel.md: 83ffb320a20a5a2525e30a05d743888cf38ce2838f454577a65c1ada99317bba
  requirements/ui/work.md: 3ea69fad0c027ba678f8919cd9397e7812bcabcb057954244c615c83f9f9c88d
  requirements/ui/agents.md: c94cd8980ef769abeb12065e673d6f2a9e4dc2103c82158760b46655a5a9921a
  requirements/rules/drifts.md: bc7dd20f0c987e5a2f432552ffc06925ad5485d2e308e72254d3d5a9204dd5c6
  editor-panel/panel.md: 90993997423fe952fe21537d35a517eacb68b9fcdf5937a65b2237e509747205
  actors/developer.md: 8e81b06a769663a87ab3163c68677b1d82fb2943f6ae47f1db6e28502e718598
  work/drift.md: fe0400ecaec7d4d7ffc775930ac9478aa61efaeda8c6bdc536047ef7020c69ae
  model-changes/proposal.md: 4141fa977c903458f0a0fcc1ef3e6bd39cde3b5ebb89e6e070ee9c1730fcc030
delete: []
created: 2026-10-16T05:45:04.581Z
---
# Avvio in ogni finestra, Dismiss Drift nel pannello e progettazione solo dalla Board

Risoluzione dei Drift: il Modello e i Requisiti si adeguano al comportamento che il codice ha già.

- `jszvs0k1` – L'estensione si avvia anche nelle cartelle senza progetto Trama: si adegua il Modello al codice. L'estensione si avvia in ogni finestra all'avvio dell'editor, così il pulsante «Trama» della barra di stato c'è sempre.
- `dp17fs43` – Il Diagramma permette di scartare un Drift dai suoi dettagli: si adegua il Modello al codice. Dalla scheda della Board e dai dettagli del Diagramma il developer chiude un Drift senza cambiare nulla con Dismiss Drift, dopo una conferma, e la Proposal allegata, se c'è, è scartata.
- `crtz08k3` – Il Diagramma non offre più i pulsanti per progettare una modifica: si adegua il Modello al codice. Nel Diagramma c'è solo Scan; Quick request… e Design… stanno solo nella Board.
