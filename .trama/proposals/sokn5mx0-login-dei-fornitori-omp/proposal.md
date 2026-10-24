---
status: approved
base:
  editor-panel/panel.md: 905349caebf6128d4aee39a49b099bd726ba097ac846e29e54416b5b5b0f0180
  project-setup/setup-wizard.md: 7256b179b1fe03045e4fa43366bf73695dcfa7a4146079eaa4f4c013b47f6820
  actors/developer.md: b735b01e74ae75abfffd4aafc0c969906bc6df3b58a8f0c43e7263dacc2efe3e
  requirements/ui/omp-login.md: new
  requirements/ui/setup-wizard-steps.md: 5b86b092d0b2648d70dcc41e18a6257f6cd36039e3f18184da0fa6014c5b142c
  requirements/rules/omp-login.md: new
  requirements/rules/setup-wizard.md: aa2f0c8fbfb527687049d58b4fcbc049e7b061967b47a7219457de20ce4493f3
  requirements/tech/omp-login.md: new
  requirements/quality/omp-login.md: new
delete: []
request: 2026-10-24T18-59-26
created: 2026-10-24T17:15:10.307Z
label: Login fornitori
---
# Login dei fornitori omp

La richiesta: dalle impostazioni di Trama il developer accede ai fornitori di modelli di omp con una serie di pulsanti, uno per fornitore, che avviano il login SSO.

Decisioni dell'intervista:
- Fornitori: un elenco fisso in Trama di sette fornitori SSO, in quest'ordine: ChatGPT Plus/Pro (Codex), Anthropic (Claude Pro/Max), GitHub Copilot, Google Gemini CLI, Google Antigravity, Cursor, xAI Grok. Nessun pulsante per gli altri fornitori di omp.
- Dove: nel gruppo omp della scheda Settings e nel passo omp del wizard di setup.
- Stato: ogni riga dice se il fornitore è collegato, cioè se omp ne ha modelli usabili (qualunque sia il modo: login, chiave, variabile d'ambiente).
- Login: a ogni clic un terminale nuovo e visibile nell'area dei terminali, con il cursore dentro e senza ghost, che esegue il login di omp per quel fornitore e resta aperto finché il developer lo chiude, come Install omp.
- Fine del login: Trama rifà in silenzio la verifica di omp, lo stato dei fornitori e i suggerimenti dei modelli dove sono aperti; nessun avviso.
- Nessun logout da Trama.
- Senza omp che risponde la sezione non compare.
- Un fornitore già collegato ha il pulsante «Log in again», che rifà il login (omp rinnova o aggiunge un account).
- Nel passo omp del wizard Next richiede anche che omp abbia almeno un modello usabile, di qualunque fornitore; il tooltip dice «omp has no models yet. Log in to a provider or set an API key.».
- Aspetto: sotto il riquadro di omp una sezione «Providers» con la frase «Log in to the model providers you use with omp.», una riga per fornitore con nome breve, abbonamento in testo secondario, stato («Connected» con `CircleCheck` o «Not connected») e pulsante «Log in» / «Log in again» con icona `LogIn`.
- Un tooltip spiega Google Gemini CLI («Gemini models through Google Cloud Code Assist, the Gemini CLI login.») e Google Antigravity («Gemini, Claude and GPT-OSS models through Google's Antigravity login.»).
- Il terminale si chiama «Log in to <nome breve>».
- Durante una verifica le righe tengono l'ultimo stato noto; alla prima verifica la sezione non c'è ancora.
- Se omp risponde ma l'elenco dei modelli fallisce, le righe restano senza stato, con «Log in».

Assunzioni dell'agente, da controllare:
- Nomi brevi e abbonamenti: ChatGPT · Plus/Pro (Codex); Anthropic · Claude Pro/Max; GitHub Copilot · Copilot subscription; Google Gemini CLI · Cloud Code Assist; Google Antigravity · Gemini, Claude, GPT-OSS; Cursor · Cursor subscription; xAI Grok · SuperGrok or X Premium+.
- Gli id di omp (`openai-codex`, `anthropic`, `github-copilot`, `google-gemini-cli`, `google-antigravity`, `cursor`, `xai-oauth`) sono anche gli id dei fornitori dei loro modelli in omp 18.12.6, letti dal sorgente di omp.
- Il tooltip di ogni pulsante di login è «Open a terminal that logs omp in to <nome breve>»; per i due Google la loro frase compare sopra.
- Il terminale di login, come le chiamate `execFile` a omp, mette in testa al PATH le cartelle di omp e di bun, perché omp parta anche dal launcher del desktop.

## Already present
- `panel/Closed/developer.SHOW_SETTINGS` — `extension/src/menu-protocol.ts:18` (`trama.showSettings`), `extension/src/host/controller.ts:173` `openSettings`
- `panel/Open/developer.SHOW_SETTINGS` — `extension/src/host/controller.ts:173` `openSettings` (`navigate` to `settings`)
- `panel/Closed/developer.OPEN_GUIDED_SETUP` — `extension/src/host/controller.ts:209` (`guidedSetup` `empty-model` from Import from Code)
- `panel/Open/developer.OPEN_GUIDED_SETUP` — `extension/src/host/controller.ts:510-511`, `extension/src/webview/main.tsx:127` `settings.openGuidedSetup`
- `setup-wizard/Closed/developer.OPEN_GUIDED_SETUP` — `extension/src/webview/wizard/logic.ts:87` `openWizard`
- `setup-wizard/Path/developer.NEXT_SETUP_STEP` — `extension/src/webview/wizard/logic.ts:144` `nextStep`, `extension/src/webview/wizard/controller.ts:255` `next`
- `setup-wizard/Models/developer.PREVIOUS_SETUP_STEP` — `extension/src/webview/wizard/logic.ts:153` `previousStep`
- `setup-wizard/Models/developer.OPEN_SETUP_STEP` — `extension/src/webview/wizard/logic.ts:133` `openStep`
- `setup-wizard/Project/developer.OPEN_SETUP_STEP` — `extension/src/webview/wizard/logic.ts:133` `openStep`
- `setup-wizard/Folders/developer.OPEN_SETUP_STEP` — `extension/src/webview/wizard/logic.ts:133` `openStep`
- `setup-wizard/Advanced/developer.OPEN_SETUP_STEP` — `extension/src/webview/wizard/logic.ts:133` `openStep`
- `setup-wizard/Summary/developer.OPEN_SETUP_STEP` — `extension/src/webview/wizard/logic.ts:133` `openStep`
