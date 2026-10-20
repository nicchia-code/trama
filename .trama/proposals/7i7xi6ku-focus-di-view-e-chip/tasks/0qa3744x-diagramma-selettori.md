---
refs:
  - diagram
  - developer.CHOOSE_DRAWN_PROPOSAL
---
# Livelli e selettori

Il Diagramma apre i livelli del focus come un link e ricade di livello solo per il proprio selettore di Proposal.

Quando il Task è fatto:

- Un pulsante View on diagram, un chip o un passo del focus aprono il livello del passo come seguire un link, e la vista si adatta agli elementi del passo invece che a tutto il livello (vedi il Focus). Anche seguire un link a un solo elemento adatta la vista a lui.
- `developer.CHOOSE_DRAWN_PROPOSAL` è la scelta nel selettore di una scheda (Diagramma, Requisiti o Specs); ogni scheda ha il suo selettore e la sua Proposal disegnata. Le ricadute di **Feature level**, **Machine level** e **State level** verso **System level** o **Machine level** valgono solo con il selettore del Diagramma, e solo se ciò che si guardava non esiste, o non ha più sotto-Stati, nel Modello disegnato con la Proposal ora scelta.
- Un pulsante View di una Proposal la disegna con `developer.FOCUS_PROPOSAL`, non con `CHOOSE_DRAWN_PROPOSAL`.
