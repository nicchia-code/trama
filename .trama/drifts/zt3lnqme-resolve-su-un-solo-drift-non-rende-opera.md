---
status: resolved
resolution: fix-code
refs:
  - developer.ASK_AGENT
proposal: null
task: g8apjxvv
origin: null
critical: false
option: 1
note: null
resolvedBy: uw0a9dir
created: 2026-10-17T11:41:15.826Z
---
# Resolve su un solo Drift non rende operativa la delega dopo l'apertura dell'editor

## What happens

Dopo l'apertura dell'editor la delega aspetta la ripresa. Un Resolve Drifts sul solo Drift scelto non la rende operativa: né il ramo automatico né quello manuale chiamano la ripresa del coordinatore, a differenza di Resolve all. Dopo quella raccolta, gli altri Drift automatici restano in attesa finché non arriva uno scan o un nuovo Resolve.

## What should happen

Ogni Resolve Drifts riuscito, su tutti i Drift o sul solo Drift scelto, rende operativa la delega prima della raccolta successiva, come descrive la transizione Free → Resolving del Model.

## Fix options

### Riprendere la delega anche dal Resolve su un solo Drift

Il ramo di resolve-drifts con un solo Drift chiama la stessa ripresa del coordinatore usata da Resolve all, sia nel ramo automatico sia in quello manuale.

### Lasciare il comportamento attuale e documentarlo

Il Resolve su un solo Drift resta senza ripresa. Il Model andrebbe però corretto, e questo non è consentito senza decisione del developer.

## Where in the code

extension/src/host/controller.ts:1087-1102 (ramo resolve-drifts con action.drift: startAutomaticResolution e send senza resumeCoordinator)
