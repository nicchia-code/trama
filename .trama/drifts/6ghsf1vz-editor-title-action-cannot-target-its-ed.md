---
status: resolved
resolution: fix-code
refs:
  - requirements/ui#design-request
proposal: null
task: pjk207nw
origin: impifveg
option: 1
note: null
resolvedBy: eb51z7tp
created: 2026-10-10T16:51:44.348Z
---
# Editor title action cannot target its editor group

## What happens

Con più gruppi, l'azione Send to agent appare nelle barre dei gruppi non attivi quando la richiesta attiva non è stata inviata.

## What should happen

Send to agent deve comparire soltanto nella barra del gruppo a fuoco, e solo se quel gruppo mostra una richiesta mai inviata.

## Fix options

### Usare un controllo per scheda

Sostituire l'azione globale della barra con un controllo realmente associato alla scheda attiva e al suo gruppo. Richiede un'integrazione UI diversa, ma garantisce la visibilità richiesta.

### Accettare l'azione globale

Mantenere il contributo attuale, che non può distinguere le barre dei gruppi. È il cambiamento minore ma lascia visibile l'azione nei gruppi inattivi.

## Where in the code

extension/package.json editor/title; extension/src/host/design-requests.ts
