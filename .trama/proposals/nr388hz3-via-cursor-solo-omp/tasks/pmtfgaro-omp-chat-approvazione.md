---
refs:
  - omp-chat-conversation
  - requirements/rules#omp-chat-conversation
  - requirements/tech#omp-chat-conversation
  - requirements/ui#omp-chat-conversation
  - requirements/quality#omp-chat-conversation
---
# Approvazione dei permessi in omp Chat

Nuova impostazione `trama.ompChatApproval`: stringa, `enum: ["ask", "yolo"]`, default `ask`, `scope: "application"`, nel gruppo Features di `SETTING_GROUPS` (`extension/src/host/settings-schema.ts`) subito dopo `trama.ompChat`, con il titolo esplicito `omp Chat Approval` in `EXPLICIT_TITLES`, mostrata come Select nella scheda Settings. Si legge solo da `inspect("trama.ompChatApproval").globalValue`: `yolo` vale yolo, ogni altro valore o l'assenza vale `ask`. Si legge all'apertura di ogni conversazione (Quick Task e Ask more compresi); una conversazione ripresa dopo una ricarica riparte con gli argomenti salvati all'apertura. Vale solo per i processi di omp Chat, non per il terminale di omp. La sua descrizione nel manifest e il README dicono che in yolo omp esegue ogni comando senza chiedere.

Argomenti del processo: `[opzioni del lavoro] acp`, più `--yolo` solo con `yolo`. `ompArguments` (`extension/src/host/terminal-agent.ts:48-49`) riceve la scelta invece di aggiungere sempre `acp --yolo`; i commenti in `extension/src/host/omp-chat/client.ts:1-5,325` e `ports.ts:13` si aggiornano.

Con `ask` ogni `session/request_permission` di ACP non ha più la risposta automatica: `requestPermission` in `extension/src/host/omp-chat/client.ts:163-165` resta in attesa e l'host manda al webview `permissionRequest { id, requestId, toolCall, options }` con le opzioni così come omp le dà; il webview risponde `permissionAnswer { id, requestId, optionId }`, validato con zod in `extension/src/omp-chat-protocol.ts` e ignorato se l'opzione non è fra quelle offerte. Con `yolo`, se arriva comunque una richiesta, resta la risposta di oggi (`permissionOutcome` in `src/core/omp-acp.ts:13-17`: prima `allow_always`, poi `allow_once`). La richiesta aspetta senza limite di tempo; Stop e la chiusura della conversazione rispondono `cancelled`. Un messaggio scritto mentre aspetta si accoda come ogni messaggio mandato mentre l'agente lavora e non risponde alla richiesta. Lo stato di una conversazione nel messaggio `conversations` prende il valore `waiting-permission` mentre una richiesta aspetta.

Vista (`extension/src/webview/omp-chat/`): la richiesta compare nel flusso come riquadro con il bordo nel colore degli avvisi, in testa `omp asks permission`, poi la riga compatta della chiamata allo strumento con icona e titolo, e un `Button` di shadcn/ui per ogni opzione, col nome e nell'ordine di omp, variante `outline` per quelle che rifiutano. Dopo la scelta resta in sola lettura con l'opzione scelta; dopo Stop o chiusura dice `Cancelled`. Con `waiting-permission` la scheda della conversazione ha il puntino nel colore degli avvisi, come per un modulo.

Testo della Machine omp Chat conversation: la vista è nella barra laterale secondaria, senza pannello in basso di Cursor e senza «non la chat di Cursor»; con omp Chat spenta Trama apre il terminale. Qualità: `trama.ompChat` e `trama.ompChatApproval` si leggono solo dalle impostazioni utente; la prova di compatibilità è solo nella barra laterale secondaria di VS Code 1.106 o successivo, senza Cursor 3.27.6; l'accettazione in `docs/uat.md` esercita anche una richiesta di permesso con `ask` (scelta di un'opzione, Stop durante l'attesa) e una conversazione con `yolo`. La regola sui file MCP di altri strumenti (`.cursor/` non letto) resta com'è.

Test: aggiornare i test di `ompArguments` (con e senza `--yolo`), dello schema delle impostazioni (nuova voce e posizione), del protocollo (`permissionRequest`, `permissionAnswer`, `waiting-permission`), del client (attesa, risposta scelta, `cancelled` su Stop e chiusura, risposta automatica solo con yolo) e del webview omp Chat (riquadro, pulsanti, stato dopo la scelta, puntino).
