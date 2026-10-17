---
status: approved
base:
  requirements/ui/panel.md: 76f2b0551793a99022fc39b06b13e067623642028b8676426978899c05bf347c
  requirements/tech/project-panel.md: 754387fd14376e401a426e2bebf06f83a0112bfc3d0ba9d393376bbf5f89b01e
delete: []
request: 2026-10-16T21-14-46
created: 2026-10-16T19:25:46.280Z
---
# Icone sui pulsanti della Board

Il developer vuole più icone nell'interfaccia: almeno nella Board ogni pulsante deve avere, oltre al testo, un'icona che lo rappresenti.

Decisioni prese:
- Hanno l'icona tutti i pulsanti con testo della Board: barra, fondo colonne, pulsanti delle schede e Close degli avvisi; chip, badge, righe dei Drift della risoluzione e menu del periodo restano come sono.
- Le stesse azioni nel Diagramma (Scan, Approve, Reject, Dismiss Drift) hanno la stessa icona; il resto del pannello non cambia.
- Mappa delle icone proposta: tutti i Run usano play, i gemelli di barra e colonna condividono l'icona.
- Icone come SVG inline ricavati dai glifi codicon, come oggi; nessun font di icone.
- Sempre icona a sinistra più testo, anche quando lo spazio è poco.
- Icona nel colore del testo del pulsante, anche primario o disabilitato.
- La chevron della colonna Done diventa il glifo codicon chevron-right / chevron-left.
