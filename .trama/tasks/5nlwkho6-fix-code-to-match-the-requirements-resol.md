---
column: done
technical: true
refs:
  - requirements/rules#drift-resolution
drift: o527nb31
proposal: null
agent: false
created: 2026-10-17T17:08:39.168Z
finished: 2026-10-17T18:10:26.864Z
---
# Fix code to match the Requirements: Resolve su un solo Drift limita le raccolte successive

## What happens

Un Resolve sul solo Drift, premuto mentre uno scan è in corso, viene rifiutato dalla raccolta automatica, ma la scelta di quel Drift resta in memoria: le raccolte successive considerano solo quel Drift, e gli altri Drift ammissibili non partono finché il developer non preme Resolve all o un altro Resolve riuscito.

## What should happen

Una raccolta automatica considera tutti i Drift aperti e ammissibili del progetto, in ordine di creazione; il Resolve sul solo Drift vale soltanto per l'avvio che il developer ha chiesto, e un avvio rifiutato non cambia la scelta delle raccolte che seguono.

## Chosen option

**Azzerare la scelta quando l'avvio è rifiutato**

Nel ramo del Resolve su un solo Drift, azzerare namedAutomatic anche quando la raccolta non parte, così la raccolta successiva considera di nuovo tutti i Drift ammissibili.

## Where in the code

extension/src/host/controller.ts:1094-1099 (ramo resolve-drifts con un solo Drift: namedAutomatic impostato prima di startAutomaticResolution e azzerato solo se launchedNow); extension/src/host/controller.ts:523-529 (eligibleDrifts filtra su named)
