---
column: done
technical: false
refs:
  - omp-chat
  - requirements/rules#omp-chat
  - requirements/tech#omp-chat
  - requirements/ui#omp-chat
  - requirements/ui#omp-chat-general
drift: null
proposal: rqs3fipe
agent: false
created: 2026-10-23T20:44:43.090Z
finished: 2026-10-23T21:07:20.445Z
---
# Vista omp Chat con General

La vista omp Chat mostra la conversazione General come scheda fissa, prima di tutte, accanto alle conversazioni dei lavori di Trama.

## Stati della vista (Machine `omp-chat`)
- La vista parte da Hidden all'apertura della finestra e segue subito impostazioni, General e conversazioni riprese.
- Da Hidden:
  - `editor.SETTINGS_CHANGED` porta a Empty solo se omp Chat è accesa e la finestra non ha una cartella aperta, quindi non ha General.
  - `omp-chat-general.SHOWN` porta a With conversations: General compare in una finestra con cartella e omp Chat accesa, e la vista mostra la sua scheda.
  - `omp-chat-conversation.OPENED`, cioè una conversazione ripresa, porta a With conversations.
- Empty esiste solo in una finestra senza cartella.
- In With conversations:
  - `omp-chat-conversation.CLOSED` resta in With conversations se restano General o altre conversazioni; se la scheda chiusa era in vista, la vista passa a una scheda vicina. Porta a Empty se era l'ultima, non c'è General e omp Chat è accesa; a Hidden se era l'ultima, non c'è General e omp Chat è spenta.
  - `omp-chat-general.SHOWN` (per esempio omp Chat riaccesa) mette la scheda di General prima delle altre senza cambiare quella in vista.
  - `omp-chat-general.REMOVED` resta in With conversations se restano conversazioni dei lavori, e se General era in vista la vista passa alla prima scheda rimasta. Se non resta nessuna conversazione porta a Hidden.
  - `editor.SETTINGS_CHANGED` con omp Chat spenta lascia la vista finché l'ultima conversazione di un lavoro non è chiusa.
- All'apertura della finestra la scheda in vista è General, salvo una conversazione di un lavoro ripresa, che si mostra come quando si apre e diventa quella in vista. Una conversazione nuova di un lavoro si aggiunge dopo le altre e diventa quella in vista.
- La chiave di contesto `trama.ompChatVisible` vale `true` quando omp Chat è in uso, o quando la finestra ha General o almeno una conversazione aperta; altrimenti vale `false`. Spegnere omp Chat non chiude nessuna conversazione di un lavoro: la vista sparisce quando l'ultima si chiude, General non c'è più e omp Chat non è in uso.
- General non esegue mai `trama.ompChatSidebar.focus`: General non apre mai la barra laterale da sé. I lavori la eseguono con `preserveFocus: true`, Ask more senza.

## Schede
- Il messaggio `conversations` ha `items[].general?: true`. General, quando c'è, è sempre la prima voce, con `name: "General"`.
- La scheda `General` è sempre la prima a sinistra e non scorre via quando la riga scorre di lato.
- Come le altre schede, ha il puntino animato durante un turno e il puntino nel colore degli avvisi mentre aspetta un modulo o un permesso.
- Al posto della `X` ha un pulsante con l'icona lucide `Eraser`, con tooltip e nome accessibile `Clear General`, che manda `clearGeneral`.
- Nella fase `kept` (`omp-chat-general/Kept after switch-off`) ha invece la `X`, con tooltip e nome accessibile `Close General`, che manda `closeConversation` con l'identità di General.
- `Delete` sulla scheda fa ciò che fa il suo pulsante: chiude la conversazione di un lavoro come la `X` e pulisce General come la gomma (o la chiude nella fase `kept`).
- `Quick` sparisce dall'elenco dei nomi delle schede: Add Quick Task non c'è più. Una conversazione `Quick` salvata prima riprende come le altre conversazioni senza lavoro, finché il developer non la chiude.

## Contenuto di General
General usa la stessa vista delle altre conversazioni, senza messaggio con l'etichetta `Trama`. La vista disegna le righe da `generalStatus { phase, error?, newSession? }`, che produce l'host:
- **Vuota:** testo secondario al centro, `Chat with omp in this folder. Trama's jobs open in their own tabs.` Il campo del messaggio c'è sempre ed è attivo anche nelle fasi `starting` e `resuming`.
- **Avvio:** un messaggio mandato mentre omp parte compare subito, con sotto la riga secondaria `Starting omp…`. La riga sparisce quando la sessione è aperta e il messaggio parte.
- **Errore:** con `error.kind` `start` o `exited`, in fondo compare una riga nel colore di errore con l'icona lucide `TriangleAlert`: `omp could not start: <motivo>.` o `omp stopped: <motivo>.`. Sotto c'è, in testo secondario, `Your next message starts omp again.`. Un messaggio che aspettava l'avvio torna nel campo con il suo testo e non resta nella conversazione.
- **omp mancante:** con `error.kind` `missing`, la riga è `omp is not installed. Trama runs every agent with omp.` con il pulsante `Install omp`, uguale a quello della scheda Settings, che manda `installOmp`. Nessun avviso dell'editor.
- **Nuova sessione:** con `newSession: true`, sotto la storia compare la riga secondaria `New session: the agent does not remember the messages above.`, e la conversazione continua sotto.
- **Ripresa:** General ripresa dopo una ricarica non ha nessuna riga sulla ricarica e nessun messaggio di ripresa.
- **Pulizia:** dopo la pulizia General è vuota e il selettore del modello torna al modello del ruolo.

## Fuori da questo Task
Appartengono al Task sulla Machine `omp-chat-general` il lato host di General:
- processo e sessione di omp;
- logica di pulizia e chiusura, con i dialoghi modali;
- voce salvata e ripresa;
- coda dei messaggi;
- produzione di `generalStatus` e gestione di `clearGeneral` e `installOmp`.

La rimozione di Add Quick Task dal pannello appartiene ad altri Task.

## Codice noto
- `src/core/omp-chat-view.ts`: `chatViewState`, `ompChatVisible`, `tabAfterClose`, `tabKeyAction`, che oggi contano solo inUse e il numero di conversazioni.
- `extension/src/host/omp-chat/view-model.ts`: stato, conteggio, apertura e chiusura, `ChatSurface` con focus e chiave di contesto.
- Il listener della configurazione è in `extension/src/host/main.ts`.
- `extension/src/webview/omp-chat/app.tsx`: `Empty`, `ChatApp`, `createChatController`.
- `extension/src/webview/omp-chat/tabs.tsx`: `ConversationTabs`, con la `X` e `Close <nome>`.
- `extension/src/webview/omp-chat/blocks.tsx`: `ErrorMessage`, `Notice`.
- `extension/src/webview/omp-chat/conversation.tsx`: `Composer`.
