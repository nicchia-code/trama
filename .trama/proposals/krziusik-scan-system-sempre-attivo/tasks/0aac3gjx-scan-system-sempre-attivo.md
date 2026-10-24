---
refs:
  - menu-laterale
  - task
  - requirements/ui#menu-laterale
  - requirements/tech#menu-laterale
  - requirements/rules#work
  - requirements/tech#panel/Settings
  - requirements/ui#panel/Settings
  - requirements/data#task
  - requirements/tech#task
---
# Scan System sempre attivo

Il pulsante Scan System del menu laterale (la vista di Trama nella barra delle attività) lancia lo scan di tutto il Sistema anche con l'Advisor Scanner acceso, esattamente come con l'Advisor Scanner spento.

Quando il Task è finito vale:

- Scan System non è mai disattivato dall'Advisor Scanner: nessuna riga «Scan is off during Runs.» sotto di lui, nessun `aria-describedby`, e porta sempre l'etichetta `Scan System · N` con N > 0 Task finiti dall'ultimo scan globale (`Scan System` con N = 0) e il nome accessibile con la frase `N Tasks finished since the last scan of the System`.
- Premerlo apre la stessa conferma di sempre («Scan the whole System?»); confermando, lo scan del Sistema parte senza aprire il pannello e senza spostare il focus, e alla consegna dell'istruzione Trama scrive il ricordo dell'ultimo scan globale (`.trama/last-scan/system`), così il numero torna a zero, anche con l'Advisor Scanner acceso. Annullando non succede nulla.
- L'host non rifiuta più nessuna richiesta di scan per l'Advisor Scanner: sparisce il rifiuto `Scan is unavailable: the Advisor Scanner is on.` in `launchAction`, sia prima del lancio sia alla consegna.
- Lo scan lanciato con l'Advisor Scanner acceso non ha advisor: nessun `--advisor`, nessun overlay degli advisor, nessun `TRAMA_ADVISOR_SCANNER`, nessuna frase dell'Advisor Scanner (oggi il codice lo fa già, perché li dà solo ai Run: va solo verificato).
- `menuState` non porta più `advisorScanner` (protocollo del menu, `MenuSurface`, provider); `configuredAdvisorScanner` serve solo ai lanci dei Run. `scanButtonLabel` perde il parametro dell'Advisor Scanner e `SCANS_OFF_TOOLTIP` sparisce (se il Task del Diagramma non l'ha già tolto, coordinarsi: il file è condiviso).
- La descrizione di `trama.advisorScanner` nel manifest è «On: during every Run an advisor, using the Scan model, checks the code against the Model and files Drifts instead of the Run's own scans. Scan System still works.»
- Il pre-flight e la scansione mirata di fine corsa dei Run restano spenti con l'Advisor Scanner acceso, come oggi.
- I test che fissavano Scan System disabilitato e `advisorScanner` in `menuState` sono riscritti: con l'Advisor Scanner acceso Scan System è attivo, mostra `· N`, chiede la conferma e lancia lo scan del Sistema scrivendo il ricordo. `CHANGELOG.md` registra il cambiamento e `docs/uat.md` riscrive il passo AA6.

Posti nel codice già noti:

- `menu-laterale/Project` — `extension/src/webview/menu/app.tsx` `ScanSystem` (righe ~40-69)
- `requirements/ui#menu-laterale` — `extension/src/webview/scan-label.ts` `scanButtonLabel`, `SCANS_OFF_TOOLTIP`
- `requirements/tech#menu-laterale` — `extension/src/menu-protocol.ts` `MenuState.advisorScanner`; `extension/src/host/menu/model.ts` `MenuModel.state()`; `extension/src/host/menu/view.ts` `MenuView.surface()` (`advisorScanner`, `scan`)
- `requirements/rules#work` — `extension/src/host/controller.ts` `launchAction` / `refusal()` (riga ~1498), `rememberScan` (~1511)
- `requirements/tech#panel/Settings` — `extension/src/host/agent.ts` `configuredAdvisorScanner` (riga ~46, uso nei Run a ~648)
- `requirements/ui#panel/Settings` — `extension/package.json` `trama.advisorScanner` `markdownDescription` (~245)
- `requirements/tech#task` — `src/core/last-scan.ts` `writeLastScan`; `src/core/snapshot.ts` `tasksSinceScan`
- test: `test/menu-webview.test.tsx` (~93-104), `test/menu-model.test.ts`, `test/host-menu.test.ts` (~297, 316-318, 383-410), `test/scan-label.test.ts`; docs: `docs/uat.md` (~936), `CHANGELOG.md`
