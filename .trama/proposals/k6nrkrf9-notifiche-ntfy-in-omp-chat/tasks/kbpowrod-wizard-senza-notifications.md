---
refs:
  - setup-wizard/Advanced
  - setup-wizard/Project/developer.NEXT_SETUP_STEP
  - setup-wizard/Folders/developer.NEXT_SETUP_STEP
  - setup-wizard/Summary/developer.OPEN_SETUP_STEP
  - setup-wizard/Summary/developer.PREVIOUS_SETUP_STEP
  - requirements/tech#setup-wizard
  - requirements/ui#setup-wizard
---
# Wizard senza Notifications

Il passo `Advanced` del wizard di setup e il suo riepilogo prendono i sottogruppi da `SETTING_GROUPS` (`extension/src/host/settings-schema.ts`), senza le chiavi elencate in `NOT_IN_WIZARD` di `extension/src/webview/wizard/logic.ts` (oggi solo `trama.autoExit`). Il nuovo sottogruppo `Notifications` del gruppo `Advanced` ha `trama.ntfyServer` e `trama.ntfyTopic`, che si impostano solo nella scheda Settings: entrambe le chiavi entrano in `NOT_IN_WIZARD`.

Quando il Task è fatto, il passo `Advanced` mostra solo i quattro sottogruppi `Appearance`, `Drifts`, `Agents` e `omp Chat`, e né il passo né il riepilogo hanno righe per le impostazioni di `Notifications`, che si impostano solo nella scheda Settings. Il test dei gruppi verifica ancora che ogni chiave del manifest stia in un solo gruppo o sottogruppo, e prova che il wizard salta `Notifications`. Se il sottogruppo non esiste ancora in `SETTING_GROUPS`, il Task lo aggiunge come descritto in `tech#away-notifications`.
