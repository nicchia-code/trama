---
status: approved
base:
  requirements/ui/panel.md: c7af275798d9f49ebef1d79b9c627f9b7ba156cbf026637251940a918e3aaeb6
  requirements/ui/menu-laterale.md: 3fc6a6736672b63084a2ae5ff3cc254777870a0774f228c906c784a48b088b81
delete: []
request: 2026-10-24T17-54-10
created: 2026-10-24T15:55:57.866Z
label: Scan disattivato
---
# Testo Scan disattivato

Il testo che spiega gli Scan disattivati dall'Advisor Scanner è troppo lungo per la riga sotto `Scan System` nel menu laterale; diventa più breve.

Decisioni:
- Il nuovo testo è `Scan is off during Runs.`, al posto di `Scans are off: the Advisor Scanner checks the code during Runs.`.
- Vale ovunque: tooltip e nome accessibile di ogni pulsante Scan disabilitato (`Scan System` nel menu laterale e `Scan` nella barra del Diagramma a ogni livello) e riga sotto `Scan System` nel menu laterale.

Raffinamento:
- `requirements/ui/panel.md` riscritto sul frammento attuale: resta la voce del menu di `+ Add Work Item` con `Unify Drifts`, `Refine All` e `Cancel Refine All` senza icona, aggiunta da un'altra Proposal approvata; cambia solo il testo degli Scan disattivati.
