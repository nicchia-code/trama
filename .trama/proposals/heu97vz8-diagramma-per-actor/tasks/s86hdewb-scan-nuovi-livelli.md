---
refs:
  - panel/Diagram
  - requirements/ui#panel
---
# Scan nei nuovi livelli

Nella barra del Diagramma, `Scan` alla radice, a Whole System e al livello di un Actor scansiona tutto il Sistema, come prima al livello del Sistema: con N > 0 Task finiti dall'ultimo scan globale porta l'etichetta `Scan · N`, con lo stesso tooltip e nome accessibile del pulsante del Sistema. Al livello di una Feature e più in basso resta com'è, senza numero. Con l'Advisor Scanner attivo è disabilitato a ogni livello (Sistema, Whole System, Actor o Feature), con l'etichetta senza `· N` e il tooltip `Scans are off: the Advisor Scanner checks the code during Runs.`.
