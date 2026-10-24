---
refs:
  - panel/Settings
  - panel/Closed/developer.SHOW_SETTINGS
  - panel/Open/developer.SHOW_SETTINGS
  - panel/Closed/developer.OPEN_GUIDED_SETUP
  - panel/Open/developer.OPEN_GUIDED_SETUP
  - requirements/tech#omp-chat
  - requirements/ui#panel/Settings
  - requirements/rules#setup-wizard
---
# Impostazione omp Chat Intent Tracing

Nuova impostazione `trama.ompChatIntentTracing` nel gruppo Features, che sceglie se l'agente delle conversazioni di omp Chat scrive a ogni chiamata a uno strumento la frase che dice perché la fa (l'Intent Tracing di omp).

- Manifest e schema: booleana, default `true`, `scope: "application"`, nel gruppo `Features` di `SETTING_GROUPS` (`extension/src/host/settings-schema.ts`) subito dopo `trama.ompChatApproval`, con il titolo esplicito `omp Chat Intent Tracing` in `EXPLICIT_TITLES`. È spenta solo quando `inspect("trama.ompChatIntentTracing").globalValue === false`; un valore assente o non booleano vale acceso, un valore del workspace non conta (un repository clonato non la cambia).
- Scheda Settings: una `Checkbox`, ultima del gruppo Features (ordine: `trama.driftBlocker`, `trama.advisorScanner`, `trama.parallelExecution`, `trama.asyncDriftResolver`, `trama.subagentsContextSharing`, `trama.ompChat`, `trama.ompChatApproval`, `trama.ompChatIntentTracing`), con la descrizione in inglese, che è la `markdownDescription` del manifest: «On: in omp Chat the agent writes why it calls each tool. Off saves tokens. Applies to conversations started afterwards.».
- Il wizard di setup ha la chiave anche nel passo `Advanced`, dopo `trama.ompChatApproval`, con le stesse regole delle altre chiavi (valore iniziale, riepilogo, scrittura solo nelle impostazioni utente).
- omp Chat non è più l'unica funzione del gruppo accesa per default: la frase di `tech#omp-chat` su `trama.ompChat` e ogni testo (README, CHANGELOG, `docs/`) che lo dice si aggiornano; il CHANGELOG annuncia l'impostazione nuova.

L'uso dell'impostazione all'avvio delle conversazioni è un altro Task.
