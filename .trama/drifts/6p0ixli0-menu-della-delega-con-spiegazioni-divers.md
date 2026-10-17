---
status: resolved
resolution: fix-code
refs:
  - panel/Settings
proposal: null
task: lgdaacxn
origin: null
critical: false
option: 2
note: null
resolvedBy: mr3hs0l5
created: 2026-10-17T06:47:44.107Z
---
# Menu della delega con spiegazioni diverse da quelle richieste

## What happens

Il menu della delega spiega i tre livelli con queste frasi: «Off: you decide on every Drift.», «The agent approves and fixes non-critical Drifts on its own; critical ones stay with you.» e «The agent approves and fixes every Drift on its own, critical ones included.».

## What should happen

I tre livelli della delega dei Drift hanno le spiegazioni richieste dai Requisiti: «Manual: you decide on every Drift (the default).», «The agent recommends, approves and fixes non-critical Drifts on its own.» e «Like enabled, critical Drifts included: the ones where your decision is urgently needed.».

## Fix options

### Usare le spiegazioni dei Requisiti

I tre livelli mostrano le spiegazioni scritte nei Requisiti, nella scheda Settings e nelle impostazioni dell'editor. Così la spiegazione che il developer legge coincide con quella richiesta, e la conferma per alzare la delega usa lo stesso lessico.

### Riscrivere le spiegazioni nel Model e nei Requisiti

Si tengono le spiegazioni del codice e si riscrivono nel Model e nei Requisiti i testi dei tre livelli, così il documento descrive quello che la scheda mostra. Il codice non cambia.

## Where in the code

extension/src/host/settings-schema.ts:78-82; extension/src/webview/settings/logic.ts:12
