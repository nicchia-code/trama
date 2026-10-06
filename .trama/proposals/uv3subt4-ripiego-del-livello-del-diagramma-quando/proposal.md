---
status: approved
base:
  editor-panel/diagram.md: e7e37e027aeb4757005869e72fb924a2bf6f602a6a81a72feb531f5f76598a02
  actors/developer.md: 8ebc0d0ebc675b7ce6c397e6eade19a9c929844285fbc7169bd9c9465633cd96
delete: []
created: 2026-10-06T15:02:45.635Z
scanScope:
  - ref: developer.CHOOSE_DRAWN_PROPOSAL
    reason: changed
  - ref: diagram
    reason: changed
  - ref: diagram/Feature level/developer.CHOOSE_DRAWN_PROPOSAL
    reason: changed
  - ref: diagram/Machine level/developer.CHOOSE_DRAWN_PROPOSAL
    reason: changed
  - ref: diagram/State level/developer.CHOOSE_DRAWN_PROPOSAL
    reason: changed
---
# Ripiego del livello del Diagramma quando cambia la Proposal disegnata

Il Diagramma, quando il developer cambia la Proposal disegnata sopra il Modello, ridisegna il Modello senza la Proposal di prima; se il livello mostrato esisteva solo grazie a lei, il codice torna al livello System (o al livello Machine dallo State level). Il Modello non lo prevede: il livello cambia solo con gli zoom e con workspace.MODEL_CHANGED. Questa Proposal aggiunge al Modello il comportamento che il codice ha già, come scelto dal developer sul Drift 945dcc15 (opzione «Aggiungere le Transizioni al Modello»).

Scelte fatte senza intervista, da verificare:
- Un nuovo Evento del developer, CHOOSE_DRAWN_PROPOSAL, per il cambio della Proposal disegnata: dal selettore (un'altra Proposal o None), selezionando un Drift che porta con sé una Proposal, o seguendo un link a una Proposal disegnata sopra il Modello.
- Le Transizioni di ripiego sono le stesse di workspace.MODEL_CHANGED, con la condizione riferita al Modello come appare con la Proposal ora disegnata: Feature level e Machine level tornano al System level; lo State level torna al Machine level se lo Stato non ha più sotto-Stati, al System level se la Machine non esiste.
- Se ciò che si guarda esiste anche con la nuova Proposal, il livello resta: nessuna Transizione.
- Nessun Requisito cambia.
