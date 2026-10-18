---
column: done
technical: true
refs:
  - requirements/tech#panel/Settings
drift: m0k7pd0q
proposal: null
agent: false
created: 2026-10-17T20:42:21.475Z
finished: 2026-10-17T20:56:12.364Z
---
# Fix code to match the Requirements: Menu della delega con testi copiati nel codice

## What happens

Il menu della delega nella scheda Settings non legge dallo schema dell'estensione i suoi tre livelli, le loro spiegazioni e il valore predefinito: li ha scritti nel codice, e le stesse frasi compaiono sia nel menu sia nella conferma che chiede di alzare la delega.

## What should happen

I Requisiti vogliono che lo schema delle impostazioni, con valori, spiegazioni, predefinito e tipo, si legga a runtime dal manifest dell'estensione, senza alcun testo o valore copiato nel codice; il codice tiene solo l'assegnazione delle chiavi ai gruppi. Così il menu non può restare indietro rispetto al manifest quando questo cambia.

## Chosen option

**Costruire il menu dallo schema**

Il menu della delega usa valori, spiegazioni e predefinito che la scheda riceve dal manifest per l'impostazione Drift autopilot, come gli altri controlli a scelta fissa. Il codice non tiene più né i tre livelli né le loro frasi. Costo: l'ordine dei livelli dipende dall'ordine dell'enum nel manifest, che va mantenuto.

## Where in the code

extension/src/webview/settings/logic.ts (delegationSetting) ed extension/src/host/settings-schema.ts (DELEGATION_ORDER e DELEGATION_DESCRIPTIONS)
