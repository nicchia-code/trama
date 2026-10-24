---
column: done
technical: false
refs:
  - omp-chat-conversation
  - developer.CLOSE_CHAT_CONVERSATION
  - requirements/rules#omp-chat-conversation
  - requirements/tech#omp-chat-conversation
  - requirements/data#omp-chat-conversation
drift: null
proposal: rqs3fipe
agent: false
created: 2026-10-23T20:44:43.090Z
finished: 2026-10-24T06:01:07.716Z
---
# Conversazioni di omp Chat senza Quick

Quando il Task è fatto, le conversazioni di omp Chat (Machine omp-chat-conversation) si aprono solo per i lavori di Trama (design, scan, Run, Resolve Drifts, Unify Drifts, import) e per Ask more: Add Quick Task non esiste più, quindi non si apre mai una conversazione `Quick` nuova e sparisce il caso Quick dall'apertura con focus. Quando una conversazione si apre per un lavoro, la vista omp Chat si mostra sulla sua scheda con `preserveFocus: true`, senza prendere il focus; solo la conversazione di Ask more prende anche il focus, nel campo del messaggio. La scelta fra terminale e conversazione si fa a ogni istruzione e Ask more, con le impostazioni di quel momento; un lavoro già partito resta dove è partito. La conversazione General non è una di queste conversazioni: la descrive la Machine omp-chat-general, e il suo avvio, la sua ripresa, la sua chiave salvata e la sua pulizia appartengono a un altro Task.

Il processo di omp di una conversazione parte con le stesse opzioni della riga del terminale di quel lavoro, nello stesso ordine, seguite da `acp` e da `--yolo` solo con `trama.ompChatApproval` su `yolo`. Ask more parte come il suo terminale: senza `--hook`, con il modello del suo ruolo e con la sua istruzione, che è il primo messaggio. Non resta nessuna variante senza istruzione per Quick.

L'approvazione (`trama.ompChatApproval`) e l'Intent Tracing (`trama.ompChatIntentTracing`, variabile `PI_INTENT_TRACING`) si leggono all'apertura di ogni conversazione, Ask more e General compresi; una conversazione ripresa dopo una ricarica riparte con le opzioni e il valore con cui era partita. I testi e i commenti che dicevano «Quick Task e Ask more» ora dicono Ask more (e General dove le impostazioni valgono anche per lei). Il modulo che mostra le domande dello strumento di domande di omp serve ad Ask more e a General (oltre a ogni altra richiesta di scelta di omp); nei lavori di Trama lo strumento resta rifiutato dall'hook.

Avvio fallito: quando il processo non parte o non apre la sessione prima che l'istruzione sia consegnata, la conversazione non si apre e la stessa istruzione parte nel terminale di omp con l'avviso di omp Chat; l'annuncio e il lavoro già scritti passano al terminale. Per Ask more si apre il suo terminale allo stesso modo. Una conversazione ripresa che non riparte non ripiega. General non ripiega mai su un terminale: è compito del Task di General, e il ripiego qui non deve mai essere raggiunto per lei.

Salvataggio: l'elenco sotto `trama.ompChat.conversations` contiene solo le conversazioni dei lavori e di Ask more, mai General (che ha la sua chiave `trama.ompChat.general`, scritta dal Task di General). `job` è assente per Ask more e per una conversazione `Quick` salvata prima che Add Quick Task sparisse. Una tale conversazione `Quick` salvata riprende come le altre conversazioni senza lavoro (ferma o in un turno secondo lo stato salvato, senza hook) finché il developer non la chiude; non se ne aprono di nuove. Il formato delle voci salvate non cambia per loro.

developer.CLOSE_CHAT_CONVERSATION per una conversazione di un lavoro o di Ask more resta com'è: conferma solo se l'agente è in un turno, ferma il processo, scarta la voce salvata. Ora quell'evento chiude anche General rimasta dopo lo spegnimento di omp Chat, ma quel caso lo implementa il Task di General; qui non cambia nulla per le conversazioni dei lavori.

Le transizioni di questa Machine sugli eventi di omp-acp restano invariate nel comportamento: le descrizioni di quegli eventi sono state solo allargate per comprendere General.

Punti noti nel codice:
- `extension/src/host/agent.ts`: `openQuickTask` e il suo uso di `openFocusedTerminal`/`quickCommandLine`/`quickOptions` (la rimozione del comando e del menu è di un altro Task; qui contano i rami della conversazione), `openConversation`/`startFailureNotice` e il ramo di `launchAgent` per il ripiego.
- `extension/src/host/omp-chat/conversations.ts`: tipo di apertura (`first?` «a Quick Task has none», `focus` «Quick Task and Ask more»), `open`, `windowClosed`/`resume`/`resumeOne`, `persist`, `closeRequested`.
- `src/core/omp-chat-conversation.ts`: schema salvato, `resumeDecision`, `CONVERSATIONS_KEY`, `SAVED_ENV_KEYS`.
- `extension/src/host/omp-chat/client.ts`: costruzione di argomenti e ambiente (`conversationLaunch`).
