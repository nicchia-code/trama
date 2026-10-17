---
status: resolved
resolution: proposal
refs:
  - panel/Settings
proposal: null
task: null
origin: null
critical: false
option: null
note: null
resolvedBy: o6ppgzbs
created: 2026-10-17T08:13:12.121Z
---
# Delega dei Drift: messaggio diverso da setSetting

## What happens

Il webview manda la delega con il messaggio setDelegation { mode }. Il messaggio setSetting per trama.driftAutoPilot non chiede conferma: planSettingChange lo rifiuta con «Drift delegation is set with the Drift autopilot menu».

## What should happen

Il Requisito tech di panel/Settings dice che il webview manda setSetting { key, value } per ogni chiave del manifest, e che per trama.driftAutoPilot l'host chiede conferma prima di scrivere.

## Fix options

### Accettare setSetting per trama.driftAutoPilot

planSettingChange passa la delega a planDelegationChange, così setDelegation resta o viene tolto. Il webview manda setSetting come dal Requisito.

### Cambiare il Requisito

Il Requisito tech di panel/Settings descrive setDelegation { mode } per la delega, come il codice fa oggi.

## Where in the code

extension/src/host/settings-schema.ts:163 (planSettingChange); extension/src/webview/settings/index.ts:158 (setDelegation); extension/src/host/controller.ts:933-935 (dispatch di setDelegation)
