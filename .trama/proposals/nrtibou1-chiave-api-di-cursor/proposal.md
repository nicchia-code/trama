---
status: approved
base:
  actors/developer.md: 2085392343980acbee4ebd5e6995467b2e993a723e6ad78fdba1eba1bed82079
  actors/editor.md: 5851589a4a3bc7a3eb2a447cb6d5aeb6d0dff83daa805fae076688b197b2f0f5
  editor-panel/panel.md: b110f781ac399095b01cc7240298d0a624ff32e9b7a3b0a1f27e6a8dee3df7ff
  project-setup/setup-wizard.md: 0a6814888d3954d56ed84ad65cadee71ca066cd838ff750d91a4e6bfba9b9c77
  agent-launching/feature.md: e0460d4d1c5c40ead2bc67486d4105a9d51227cfcfbb9e64346a7746fe20e065
  requirements/rules/omp-login.md: 232babcd39bc13a08ea820722e0d17e8111d492af66a7bbcbccfc038ed700bba
  requirements/ui/omp-login.md: fb128287ea181e686b207f816f3aacc2460315f276f5254dbf80f2b2353dcb72
  requirements/tech/omp-login.md: 30b447f24c83f6ca03658100b4a752985a2448fed3c954d5337f8957416f619b
  requirements/quality/omp-login.md: 31a5bac204476cc1fa5c5acaef12dc186b34af3fecc0982ebd1a9e8f63bb19b5
delete: []
request: 2026-10-25T03-05-58
created: 2026-10-25T02:23:45.202Z
label: Cursor API key
---
# Chiave API di Cursor

Il developer vuole usare Cursor con una chiave API, oltre che con il login nel browser. omp 18.12.6 non chiede mai una chiave in `omp login cursor`, ma legge la variabile d'ambiente `CURSOR_ACCESS_TOKEN` e con essa elenca i modelli `cursor`. Trama quindi conserva la chiave nel portachiavi dell'editor e la passa a ogni omp che avvia.

Decisioni dell'intervista:
- Trama conserva la chiave API di Cursor nel portachiavi dell'editor (spazio segreto per utente di VS Code) e la passa a omp come `CURSOR_ACCESS_TOKEN`; nessuna chiamata di rete e nessuno scambio della chiave.
- Solo Cursor; gli altri fornitori della sezione Providers non cambiano.
- La chiave si inserisce con un pulsante della riga Cursor che apre la casella di input mascherata dell'editor: la chiave non passa mai dal pannello.
- Un pulsante Remove API key, solo con chiave salvata, la toglie senza conferma.
- La riga Cursor mostra «API key saved» quando una chiave è salvata; la chiave non si mostra mai.
- Ricevono la chiave tutti gli omp che Trama avvia: lavori, omp Chat, elenco dei modelli e verifiche, terminali di login.
- Vince la chiave salvata in Trama su un `CURSOR_ACCESS_TOKEN` già presente nell'ambiente dell'editor; senza chiave salvata resta quello dell'ambiente.
- Un cambio vale dai lanci successivi; subito dopo Trama rifà la verifica di omp, i fornitori e i suggerimenti, come dopo un login.
- Nel wizard di setup la chiave si salva o si toglie subito, come il login, anche se poi il wizard è annullato.
- Una casella vuota o con soli spazi non è accettata: mostra «Enter a Cursor API key.» e resta aperta; Esc annulla.
- Testi: abbonamento «Cursor subscription or API key»; pulsante «Set API key», «Change API key» con chiave salvata; «Remove API key»; casella «Cursor API key».
- Con più finestre aperte, ognuna aggiorna subito la riga Cursor e rifà la verifica quando la chiave cambia in un'altra.
- Un errore del portachiavi mostra un errore dell'editor e non cambia nulla; senza chiave leggibile omp parte senza la chiave di Trama. Nessun ripiego su file o impostazioni.

Rischio noto: secondo la documentazione di Cursor le chiavi utente del dashboard vanno scambiate con un access token; omp non fa lo scambio, e non è verificato che una chiave del dashboard funzioni come `CURSOR_ACCESS_TOKEN`. omp elenca i modelli Cursor anche con una chiave sbagliata, quindi la riga può dire Connected con una chiave non valida.

Scelte dell'agente, da controllare: icone lucide `KeyRound` per il pulsante della chiave e `Trash2` per Remove API key; Remove API key in variante `ghost`; tooltip «Save a Cursor API key that Trama passes to omp» e «Remove the Cursor API key saved in Trama»; nome del segreto `trama.cursorApiKey` e modulo `extension/src/host/cursor-api-key.ts`; la casella non si chiude quando il fuoco passa altrove; nessun avviso conferma salvataggio o rimozione; la chiave arriva anche alla verifica della versione e all'aggiornamento di omp e a `omp usage --json`.

## Already present
- `panel/Closed/developer.SHOW_SETTINGS` — `trama.showSettings` in `extension/src/menu-protocol.ts`, `Controller.openSettings` in `extension/src/host/controller.ts`
- `panel/Open/developer.SHOW_SETTINGS` — `trama.showSettings` in `extension/src/menu-protocol.ts`, `navigate` to `settings` in `Controller.openSettings` (`extension/src/host/controller.ts`)
- `panel/Closed/developer.OPEN_GUIDED_SETUP` — `Controller.openSettings` with `guidedSetup` `empty-model` for Import from Code (`extension/src/host/controller.ts`)
- `panel/Open/developer.OPEN_GUIDED_SETUP` — `Controller.openGuidedSetup` (`extension/src/host/controller.ts`), `openGuidedSetup` in `extension/src/webview/settings/index.tsx`
- `setup-wizard/Closed/developer.OPEN_GUIDED_SETUP` — `openGuidedSetup` in `extension/src/webview/settings/index.tsx`, `guidedSetup` handling in `extension/src/webview/main.tsx`
- `setup-wizard/Path/developer.NEXT_SETUP_STEP` — `nextStep` and `nextBlock` in `extension/src/webview/wizard/logic.ts`
- `setup-wizard/Models/developer.PREVIOUS_SETUP_STEP` — Back in `extension/src/webview/wizard/index.tsx`, steps in `extension/src/webview/wizard/logic.ts`
- `setup-wizard/Models/developer.OPEN_SETUP_STEP` — `openStep` in `extension/src/webview/wizard/logic.ts`, «Go back to» buttons in `extension/src/webview/wizard/index.tsx`
- `setup-wizard/Project/developer.OPEN_SETUP_STEP` — `openStep` in `extension/src/webview/wizard/logic.ts`
- `setup-wizard/Folders/developer.OPEN_SETUP_STEP` — `openStep` in `extension/src/webview/wizard/logic.ts`
- `setup-wizard/Advanced/developer.OPEN_SETUP_STEP` — `openStep` in `extension/src/webview/wizard/logic.ts`
- `setup-wizard/Summary/developer.OPEN_SETUP_STEP` — Edit on the summary and `openStep` in `extension/src/webview/wizard/index.tsx` and `logic.ts`
