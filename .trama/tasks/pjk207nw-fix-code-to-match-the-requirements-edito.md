---
column: done
technical: true
refs:
  - requirements/ui#design-request
drift: 6ghsf1vz
proposal: null
agent: false
created: 2026-10-10T17:24:50.916Z
finished: 2026-10-10T17:32:39.942Z
---
# Fix code to match the Requirements: Editor title action cannot target its editor group

## What happens

Con più gruppi, l'azione Send to agent appare nelle barre dei gruppi non attivi quando la richiesta attiva non è stata inviata.

## What should happen

Send to agent deve comparire soltanto nella barra del gruppo a fuoco, e solo se quel gruppo mostra una richiesta mai inviata.

## Chosen option

**Usare un controllo per scheda**

Sostituire l'azione globale della barra con un controllo realmente associato alla scheda attiva e al suo gruppo. Richiede un'integrazione UI diversa, ma garantisce la visibilità richiesta.

## Where in the code

extension/package.json editor/title; extension/src/host/design-requests.ts
