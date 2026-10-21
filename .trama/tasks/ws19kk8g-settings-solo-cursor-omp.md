---
column: done
technical: false
refs:
  - panel/Settings
  - panel/Closed/developer.SHOW_SETTINGS
  - developer.SHOW_SETTINGS
  - requirements/tech#panel/Settings
  - requirements/ui#panel/Settings
  - requirements/quality#panel/Settings
  - requirements/rules#panel/Board
drift: null
proposal: 2oj2rgp7
agent: false
created: 2026-10-21T04:57:27.914Z
finished: 2026-10-21T05:00:24.728Z
---
# Settings solo Cursor e omp

Quando il Task è fatto, la scheda Settings e l'apertura del pannello seguono i due soli agenti, la chat di Cursor (`cursor`) e omp.

Suggerimenti dei modelli. I suggerimenti per `trama.analysis`, `trama.scan` e `trama.execution` vengono solo dalla chat di Cursor (in Cursor) e da omp. In `ControllerPanel.modelList` di `extension/src/host/controller.ts` con agente `omp` resta `ompModels`; con `cursor` (o un valore che vale `cursor`, come lo restituisce `configuredAgent`) e `vscode.env.appName` che contiene «Cursor» (`isCursor()`) resta `cursorModels`; in un altro editor l'elenco è `{ models: [] }`, senza `error`. Il ramo `agent === "claude"` e il ramo Copilot con `vscode.lm.selectChatModels()` si tolgono; `copilotSuggestions` si toglie da `extension/src/host/model-lists.ts` (con il suo commento) e il test «Copilot names a model as the chat takes it…» e l'import relativo si tolgono da `test/model-lists.test.ts`. Il ricalcolo resta come oggi: a ogni `modelSuggestionsWanted`, a ogni cambio di `trama.agent` o `trama.ompPath` e a ogni `vscode.lm.onDidChangeChatModels`, che in `extension/src/host/main.ts` resta registrato con qualsiasi agente. Il webview (`extension/src/webview/settings/index.tsx`) non cambia: con l'elenco vuoto il campo resta un semplice `Input` di testo; i commenti che citano Claude Code o Copilot come motivo dell'elenco vuoto si aggiornano. In `test/webview-settings.test.tsx` un caso con elenco vuoto mostra il campo come testo senza tendina (se manca, si aggiunge).

Valore rimasto. In `postSettings` di `controller.ts` il valore utente di `trama.agent` che non è `cursor` né `omp` (un `chat` o un `claude` rimasto, o qualunque altro) si manda alla scheda come `cursor`, così il controllo a scelta della scheda Settings mostra `cursor` scelto; il valore salvato non si riscrive finché il developer non sceglie. Un test del host o della logica copre `chat` e `claude` mostrati come `cursor`.

Apertura su Settings. Il pannello ha un punto d'ingresso del host, per esempio `ControllerPanel.openSettings()` accanto a `open()` e `revealForQuestions()`, che apre il pannello in primo piano se è chiuso (come `open()`, con il controllo delle skill installate) o lo porta in primo piano se è aperto, e poi lo mette sulla scheda Settings con il messaggio host → webview `navigate` già gestito in `extension/src/webview/main.tsx` (`{ type: "navigate", view: "settings" }`), mandato dopo che il webview del pannello appena creato è pronto, così la scheda Settings si mostra e chiede subito i suggerimenti. Lo usa il pulsante Open Settings dell'avviso `Trama: Cursor's chat is only available in Cursor. The prompt is on the clipboard; choose omp in Trama's Settings to run the agent in a terminal.` (l'avviso stesso è dell'Agent terminal): questo Task dà la funzione e la rende raggiungibile da chi mostra l'avviso, per esempio passandola dal `main.ts` come callback. È la Transition `developer.SHOW_SETTINGS` da Closed a Settings e, dal pannello aperto, il passaggio alla scheda Settings di `developer.SHOW_SETTINGS`. Senza cartella aperta vale il messaggio di oggi di `open()`.

Smoke test. Il testo dello smoke test di accettazione nei documenti dell'estensione che lo descrivono apre la scheda Settings con `trama.agent` su `cursor`, non più `chat`.

Board. In panel/Board cambia solo la regola dell'attesa delle schede: un terminale di Trama senza hook è soltanto quello in cui manca il modulo di omp; Claude Code non si nomina più. Nessun percorso del codice del Board dipende da Claude Code: il flag `hooked` (`extension/src/host/agent.ts`, `setHooked`, `startJob`) è calcolato dal lancio dell'agente e resta com'è; la rimozione del lancio di Claude Code, che lo rendeva falso, è di chi tocca l'Agent terminal. Non cambia altro nel Board.
