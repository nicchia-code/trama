---
column: done
technical: false
refs:
  - developer.ASK_MORE
  - developer.SEND_CHAT_MESSAGE
  - question-round/On question/developer.ASK_MORE
  - panel/Board/developer.ASK_MORE
  - announcement
  - requirements/rules#developer.ASK_MORE
  - requirements/tech#developer.ASK_MORE
  - requirements/ui#developer.ASK_MORE
  - requirements/data#omp-chat-conversation
drift: null
proposal: srkyrbvl
agent: false
created: 2026-10-24T10:27:31.669Z
finished: 2026-10-24T10:56:13.619Z
---
# Ask more vuota

In omp Chat, `Ask more` (dalle modali dei dettagli di Proposal, Task e Drift sulla Board e dalla domanda in vista di un round, `On question`) apre una conversazione vuota e non manda nulla all'agente prima che il developer scriva. Nel terminale, con omp Chat spenta, Ask more resta com'è: l'istruzione parte subito.

Quando è fatto:
- Apertura: ogni clic apre una conversazione nuova `Ask <numero breve>` o `Ask question`, che prende il focus. L'host (`openAskMore` in `extension/src/host/agent.ts`, client in `extension/src/host/omp-chat/client.ts`) fa `initialize` e `session/new` ma nessun `session/prompt`: oggi la conversazione manda subito il primo prompt (`if (first !== undefined) session.sendPrompt(first)` alla fine dell'apertura), e per Ask more non deve più. L'host tiene in memoria, per quella conversazione, l'istruzione preparata al clic: l'allegato `extension/media/ask-more.md` e la parte della cosa scelta (`askMorePart` in `extension/src/host/prompts.ts`), con la sola frase della lingua quando la lingua è attiva.
- Vista: la conversazione vuota non mostra nulla sopra il campo; il campo ha il cursore dentro e il segnaposto `Ask about <numero breve> – <titolo>…` (per esempio `Ask about T3 – Steer and queue…`), `Ask about <identità permanente> – <titolo>…` per una scheda senza numero breve, oppure `Ask about this question…` per una domanda. Il segnaposto arriva alla vista nel campo `placeholder` della voce del messaggio `conversations`, solo finché la conversazione di Ask more è vuota; dopo il primo messaggio torna `Message omp…`.
- `Send` resta disabilitato, con sotto il campo la riga di testo secondario `Starting omp…`, finché la sessione di omp non è aperta, così un avvio fallito non perde nulla di scritto. Se l'avvio fallisce, la conversazione non si apre e si apre il terminale di Ask more come con omp Chat spenta, con l'avviso `ui#omp-chat`: l'istruzione vi parte subito e il lavoro di Ask more è annunciato allora.
- Primo messaggio (`developer.SEND_CHAT_MESSAGE`): al primo `sendMessage` l'host manda un solo `session/prompt` con il blocco `resource_link` dell'allegato, un blocco di testo `Instructions from Trama (not written by the developer):` seguito dalla parte, e, separato da una riga vuota, un blocco di testo `Developer's message:` seguito dal testo del developer così come l'ha scritto; poi dimentica l'istruzione. I messaggi seguenti partono da soli. La funzione che compone questi blocchi sta in `extension/src/host/prompts.ts` ed è la stessa che usa il ripiego di General (Task `Istruzione di General`).
- La conversazione mostra soltanto il messaggio del developer, come lui l'ha scritto: nessun messaggio con l'etichetta `Trama` e nessuna riga di allegato `Paperclip`.
- Annuncio e ghost: l'annuncio di lavoro `{ kind: "work", title: <nome> }` (`announceLaunch`) si scrive quando parte il primo `session/prompt`, mai prima; allora la conversazione entra fra ciò che il controllo di esecuzione segue e la barra di stato mostra il ghost. Nel terminale l'annuncio resta subito dopo `createTerminal`.
- Salvataggio: una conversazione di Ask more ancora vuota non ha voce in `trama.ompChat.conversations` (`workspaceState`); la sua voce si scrive quando parte il primo messaggio. Chiusa vuota (senza conferma) o con la finestra chiusa o ricaricata, non lascia traccia: nessun prompt, nessun annuncio, nessun ghost, e alla riapertura non torna.
- Testo fisso `extension/media/ask-more.md` (in inglese, che comincia con la riga `Trama: Ask more`): chiede all'agente di rispondere al messaggio del developer quando segue l'istruzione, oppure, quando l'istruzione arriva da sola (terminale), di dire in breve che è pronto e aspettare la domanda; il resto del testo resta com'è.
- Il resto delle regole di Ask more non cambia: modello `trama.analysis`, nessun `--hook`, `--slow`, Advisor Scanner né auto exit, non è un Run.
- L'interruttore `Show tags` / `Hide tags` della modale dei dettagli di un Task, in `ui#developer.ASK_MORE`, non è di questo Task: lo fa il Task dei tag della Board.
- Test: un test dell'host con un client ACP finto prova che Ask more in omp Chat non manda prompt all'apertura, che il primo messaggio porta allegato, intestazioni e testo in un solo prompt, che l'annuncio nasce allora, che la voce salvata nasce allora e che la chiusura vuota non lascia nulla; un test di `prompts.ts` prova la funzione dei blocchi; un test del webview prova segnaposto, focus e `Send` disabilitato prima della sessione.
