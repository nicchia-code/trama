---
column: done
technical: false
refs:
  - panel/Settings
  - developer.CHANGE_SETTING
drift: jzyl3pqi
proposal: null
agent: false
created: 2026-10-14T20:50:08.306Z
finished: 2026-10-14T20:52:55.831Z
---
# Fix code to match the Model: Settings tab reads and saves Trama settings under the wrong keys

## What happens

La scheda Settings mostra sempre il valore predefinito, anche quando il developer ha già salvato un valore. Ogni scelta fatta nella scheda viene salvata sotto una chiave che Trama non legge, quindi l'impostazione non cambia davvero: la delega di Drift scelta dalla scheda non vale. Il dialogo di conferma compare anche quando la delega si riduce.

## What should happen

La scheda mostra il valore delle impostazioni utente del developer, salva ogni scelta in quella stessa impostazione utente e chiede conferma solo quando la delega aumenta, come descrivono panel/Settings e developer.CHANGE_SETTING.

## Chosen option

**Read and save each setting under its real key**

Leggere e salvare ogni impostazione con la chiave che Trama legge davvero, nelle impostazioni utente: la scheda mostra il valore salvato, la delega scelta dalla scheda vale e la conferma compare solo quando aumenta.

## Where in the code

extension/src/host/controller.ts: postSettings() e saveSetting(), che leggono e scrivono con la chiave completa dentro la configurazione trama; extension/src/host/agent.ts: settings(), che è getConfiguration("trama").
