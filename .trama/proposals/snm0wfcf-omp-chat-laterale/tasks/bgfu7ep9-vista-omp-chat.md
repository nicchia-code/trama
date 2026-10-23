---
refs:
  - omp-chat
  - requirements/ui#omp-chat
  - requirements/tech#omp-chat
  - requirements/rules#omp-chat
---
# Vista omp Chat

La vista omp Chat nella barra laterale secondaria, dove stanno le conversazioni di omp Chat. Ogni finestra ha la sua vista, con le conversazioni aperte in quella finestra.

Quando è finito, la vista segue gli stati della Machine omp Chat:
- Hidden (iniziale): la vista non c'è quando omp Chat è spenta (`trama.ompChat` non acceso nelle impostazioni utente) oppure `trama.agent` è la chat di Cursor, e nessuna conversazione è aperta. Con un cambio delle impostazioni che accende omp Chat con `trama.agent` su omp, anche all'apertura della finestra, passa a Empty; con una conversazione salvata ripresa all'apertura della finestra passa a With conversations, anche se nel frattempo omp Chat è stata spenta.
- Empty: la vista c'è, senza conversazioni, e mostra al centro, in testo secondario, `Trama's jobs with omp open here, one conversation each.`. Si apre una conversazione → With conversations, con la sua scheda; omp Chat spenta o agente cambiato → Hidden.
- With conversations: una scheda per conversazione, nell'ordine di apertura, con il nome del lavoro come il terminale che sostituisce (`T3`, `Design`, `Setup`, `Scan`, `All tasks`, `All tasks · <modello>`, `Drifts`, `Unify`, `Import`, `Quick`, `Ask P2`, `Ask question`), un puntino animato mentre l'agente è in un turno (fermo con `prefers-reduced-motion`), un puntino nel colore degli avvisi quando un modulo aspetta, e un pulsante `X` con tooltip e nome accessibile `Close <nome>`. Una conversazione nuova aggiunge la sua scheda e diventa quella in vista. Chiusa una conversazione, se ne restano altre e la chiusa era in vista, la vista passa a una scheda vicina; se era l'ultima, la vista va in Empty con omp Chat in uso, in Hidden altrimenti. Spegnere omp Chat o cambiare agente con conversazioni aperte non chiude nulla: le conversazioni finiscono il loro lavoro e la vista resta finché l'ultima non è chiusa, mentre le istruzioni nuove vanno al terminale di omp o alla chat di Cursor.
- La riga delle schede è un `tablist`: frecce sinistra e destra per passare da una scheda all'altra, `Delete` per chiudere come la `X`; con più schede di quante ne entrano scorre di lato senza barra visibile e la scheda scelta resta visibile.
- La vista sta in un contenitore `viewsContainers.secondarySidebar` con id `trama-omp-chat`, titolo `omp Chat` e l'icona del logo di Trama, con una sola vista `webview` `trama.ompChat` (`WebviewViewProvider`, `retainContextWhenHidden: true`) e `when: trama.ompChatVisible`; l'host imposta la chiave con `setContext`, vera quando omp Chat è in uso o la finestra ha almeno una conversazione aperta o in attesa di ripresa. Verificato che `viewsContainers.secondarySidebar` sia accettato dalla versione minima dell'API e da Cursor 3.23.12; se non lo è, il contenitore va nel `panel` e il README dice come spostarlo.
- Trama mostra la vista solo quando una conversazione si apre o si riprende, con il comando `trama.ompChat.focus` (con `preserveFocus: true` per i lavori, senza per Quick Task e Ask more); non esegue altri comandi che aprono, chiudono o spostano barre laterali.
- La webview è un secondo punto d'ingresso dello stesso build React del pannello (`dist/omp-chat.js`), con lo stesso HTML e la stessa CSP di `webviewHtml`, lo stesso tema (`trama.theme`, `startTheme`) e i componenti di shadcn/ui. Il protocollo host ↔ webview è quello di `tech#omp-chat` (`conversations`, `conversationUpdate`, `formRequest`; `selectConversation`, `sendMessage`, `stopAgent`, `closeConversation`, `setModel`, `formAnswer`), con ogni messaggio dal webview validato con zod.
- Tutti i testi sono in inglese e non seguono `trama.language`. Test dei componenti del webview per gli stati Empty e With conversations, il passaggio fra le schede da tastiera e la scheda vicina dopo una chiusura; test della logica pura della chiave di contesto.
