---
status: resolved
resolution: fix-code
refs:
  - panel/Settings
  - developer.CHANGE_SETTING
proposal: null
task: eke1knlb
origin: null
critical: false
option: 1
note: null
resolvedBy: lljo0wrf
created: 2026-10-14T20:45:03.416Z
---
# Settings tab reads and saves Trama settings under the wrong keys

## What happens

La scheda Settings mostra sempre il valore predefinito, anche quando il developer ha già salvato un valore. Ogni scelta fatta nella scheda viene salvata sotto una chiave che Trama non legge, quindi l'impostazione non cambia davvero: la delega di Drift scelta dalla scheda non vale. Il dialogo di conferma compare anche quando la delega si riduce.

## What should happen

La scheda mostra il valore delle impostazioni utente del developer, salva ogni scelta in quella stessa impostazione utente e chiede conferma solo quando la delega aumenta, come descrivono panel/Settings e developer.CHANGE_SETTING.

## Fix options

### Read and save each setting under its real key

Leggere e salvare ogni impostazione con la chiave che Trama legge davvero, nelle impostazioni utente: la scheda mostra il valore salvato, la delega scelta dalla scheda vale e la conferma compare solo quando aumenta.

### Keep the Settings tab read-only

La scheda mostra i valori ma non salva nulla: le impostazioni si cambiano dalle impostazioni dell'editor. Si rinuncia alla scelta dalla scheda che i Requisiti chiedono.

## Where in the code

extension/src/host/controller.ts: postSettings() e saveSetting(), che leggono e scrivono con la chiave completa dentro la configurazione trama; extension/src/host/agent.ts: settings(), che è getConfiguration("trama").
