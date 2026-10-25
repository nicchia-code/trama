---
column: done
technical: false
refs:
  - away-notifications
  - notice
  - ntfy
  - time
  - omp-acp.PERMISSION_REQUESTED
  - developer.ANSWER_PERMISSION
  - requirements/rules#notice
  - requirements/tech#notice
  - requirements/data#notice
  - requirements/ui#notice
  - requirements/quality#notice
  - requirements/tech#away-notifications
  - requirements/data#away-notifications
  - requirements/quality#agent-launching
  - requirements/tech#General
drift: null
proposal: k6nrkrf9
agent: false
created: 2026-10-25T08:18:58.533Z
finished: 2026-10-25T08:38:45.473Z
---
# Avvisi ntfy

Ogni finestra dell'editor manda notifiche ntfy al developer per i lavori che ha avviato in conversazioni di omp Chat con l'hook di Trama (design, scan, Run, Resolve Drifts, Unify Drifts, import, refinement). Ask more, General, i lavori nel terminale (anche il ripiego di una conversazione che non parte) e le domande pronte dell'Async Drift Resolver non notificano mai. Un avviso nasce solo se in quel momento `trama.ntfyTopic` non è vuoto.

Quando il Task è fatto:

- Le impostazioni `trama.ntfyServer` (predefinito `https://ntfy.sh`) e `trama.ntfyTopic` (vuoto per default) sono nel manifest, con `scope: "application"`, lette solo dal valore utente, con i titoli espliciti `ntfy Server` e `ntfy Topic`, nel nuovo sottogruppo `Notifications` in fondo ad `Advanced` di `SETTING_GROUPS`. Una funzione pura in `src/core` dice se server e topic sono validi: server URL assoluto `http:`/`https:` senza credenziali, query né frammento (vuoto vale il predefinito); topic `^[A-Za-z0-9_-]{1,64}$`. Il vecchio `trama.ntfy` non è dichiarato né letto.
- Quattro tipi di avviso, nati in Waiting:
  - Fine: quando la finestra smette di lavorare (nessun lavoro in corso, in conversazione o nel terminale, e nessun Run di una sequenza ancora da avviare) perché il lavoro di una conversazione è finito con `end_turn`. Non nasce se quella fine è `cancelled` (Stop), anomala, o se l'ultimo lavoro era nel terminale o è stato chiuso dal developer. Al massimo un avviso di fine per finestra. Aspetta 30 secondi di quiete: ogni `session/update` di una conversazione di lavoro rimasta aperta, o un messaggio del developer in una di esse, fa ripartire i 30 secondi; senza conversazioni di lavoro rimaste aperte (per esempio con `trama.autoExit`) parte subito. È annullato dall'apertura di qualunque conversazione di omp Chat nella finestra (un lavoro o Ask more); allo scadere non parte se la finestra lavora di nuovo.
  - Domanda: quando un round il cui `TRAMA_TERMINAL` è una conversazione di lavoro della finestra viene presentato (`question-round.ROUND_OPENED`); uno per round; 30 secondi da quel momento, non ripartono; annullato da `question-round.ROUND_CLOSED` di quel round. Serve una ricerca nuova di `context.terminal` fra le conversazioni di lavoro della finestra.
  - Permesso: per ogni `session/request_permission` di una conversazione di lavoro che aspetta il developer (solo con `trama.ompChatApproval` su `ask`); 30 secondi; annullato quando il developer sceglie un'opzione o quando la richiesta è annullata (Stop, chiusura, fine del processo, fine del turno). I segnali si prendono dalla porta della sessione, una volta per richiesta, non dal view-model, che rimanda le richieste al ritorno del webview.
  - Interrotto: senza attesa, a una fine anomala del lavoro di una conversazione in Agent running (`refusal`, `max_tokens`, `max_turn_requests`, prompt rifiutato) e a `omp-acp.EXITED` da Agent running, anche con altri lavori in corso. Non nasce per `EXITED` da Agent idle, per `SESSION_NOT_RESUMED` né per un avvio fallito.
- Nessun avviso nasce alla ripresa dopo una ricarica (`SESSION_RESUMED`, conversazioni che tornano in Agent idle); un lavoro continuato dopo la ricarica conta come ogni altro. Alla chiusura o ricarica della finestra ogni avviso in attesa o in attesa del nuovo tentativo è annullato; nulla è salvato.
- Testo composto quando l'avviso parte, in inglese: fine `<progetto> - <nome> finished` (o `<progetto> - <n> jobs finished` con più lavori finiti da quando la finestra ha ripreso a lavorare), messaggio `Trama is waiting for you.`, tag `white_check_mark`, priorità 3; domanda `<progetto> - <nome> asks a question`, `The agent is waiting for your answers.`, `question`, 4; permesso `<progetto> - <nome> asks permission`, `The agent is waiting for your approval.`, `closed_lock_with_key`, 4; interrotto `<progetto> - <nome> stopped`, `The agent stopped before finishing its work.`, `warning`, 4. `<progetto>` è il nome della cartella del progetto, `<nome>` il nome della conversazione. Nessun contenuto del lavoro, nessuna azione al click.
- Invio dall'host con la `fetch` globale: `POST` all'URL del server con il corpo JSON `{ topic, title, message, tags, priority }`, `Authorization: Bearer <token>` solo con un token salvato (chiave `trama.ntfyToken` di `ExtensionContext.secrets`), `redirect: "manual"`, limite di 10 secondi. Solo un 2xx è un successo. Un fallimento aspetta 10 secondi e riprova una sola volta con lo stesso testo, se topic e server sono ancora validi; un secondo fallimento è silenzioso. Server o topic non validi allo scadere: nessuna richiesta, nulla mostrato. Server, topic e token non compaiono mai in messaggi, log o diagnostica.
- Logica pura (nascita, stato della finestra, quiete, annullamenti, composizione, motivi) in `src/core/away-notices.ts` con test `bun:test`; un notificatore per finestra in `extension/src/host/away-notices.ts`, con timer solo mentre un avviso aspetta, fermati alla disattivazione. La funzione d'invio è riusabile per una notifica di prova con un solo tentativo.
- La descrizione del System, `tech#General` e `quality#agent-launching` dicono che l'unica chiamata di rete di Trama è questa notifica. `README.md`, `extension/README.md` e `CHANGELOG.md` descrivono le notifiche (eventi, solo lavori di omp Chat, impostazioni, token, pulsante di prova, topic pubblico su ntfy.sh); `docs/uat.md` ha i passi di accettazione di `quality#notice`.
