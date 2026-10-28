---
technical: false
refs:
  - design-request
  - requirements/rules#design-request
  - requirements/tech#design-request
---
# Richiesta senza doppio lancio

## Il problema

Lo sviluppatore segnala una regressione: con omp Chat in uso, aprendo una nuova richiesta di design si aprono sia una conversazione di omp Chat sia un terminale omp. Lo vede già con + Add Work Item, alla sola apertura della scheda della richiesta, e senza l'avviso di fallback «omp Chat could not start omp …; the job runs in a terminal»: si tratta quindi di un vero doppio lancio, non del fallback verso il terminale.

La lettura statica del codice non ha trovato alcun percorso che lanci due volte. La causa va prima riprodotta (per esempio nell'Extension Development Host, con omp Chat in uso, premendo + Add Work Item) e poi corretta alla radice; non basta nascondere il sintomo, per esempio chiudendo a posteriori il terminale o la conversazione in più.

## Cosa deve valere alla fine

- Creare una richiesta (+ Add Work Item, Start from Scratch, New handoff), aprirne la scheda, scriverci dentro e riaprirla dall'esplora file non avvia nessun agente: nessuna conversazione di omp Chat, nessun terminale omp, nessun annuncio e nessun job.
- Solo un invio che parte davvero lancia, una volta sola: Send to agent, oppure la chiusura della scheda di una richiesta mai inviata che ha testo su disco. In entrambi i casi la richiesta manda l'istruzione che la nomina verso l'agente con il launcher scelto, come ogni richiesta di design, e la chiusura della scheda manda la stessa istruzione di Send to agent.
- L'istruzione apre esattamente un posto in cui l'agente lavora: con omp Chat in uso una sola conversazione di omp Chat, chiamata `Design` (`Setup` per le richieste di setup, `Handoff` per gli handoff), e nessun terminale; con omp Chat spento un solo terminale omp e nessuna conversazione. Mai entrambi.
- Il terminale segue una conversazione solo quando quella conversazione non è riuscita a partire: in quel caso compare l'avviso «omp Chat could not start omp …; the job runs in a terminal», come oggi, e nella vista non resta nessuna conversazione di quel job. Il limite di avvio resta di 30 s per l'intera apertura; un fallimento certo (omp assente, errore di spawn, uscita del processo, sessione rifiutata) passa subito al terminale.
- Se la chiusura della scheda segue Send to agent, non parte un secondo lancio.
- Con qualunque launcher, il ghost in Backlog prende il titolo della richiesta.
- La regola «un solo launcher per istruzione» vale per tutti i job lanciati da Trama, non solo per le richieste scritte: la correzione non deve introdurre percorsi in cui un altro chiamante di `launchAgent` apra conversazione e terminale insieme.

## Test di regressione

Test con `bun:test` in `test/host-design-requests.test.ts`, che usi il vero `launchAgent` e i terminali e le conversazioni finti di `test/host-agent-terminals.test.ts` al posto del lancio stubbato attuale. Deve verificare che:

- + Add Work Item, Start from Scratch e New handoff creano e mostrano la richiesta senza conversazioni, terminali, annunci né job;
- con omp Chat in uso, Send to agent e la chiusura della scheda di una richiesta scritta aprono ciascuno una conversazione e nessun terminale, anche quando la chiusura segue Send to agent (in quel caso un solo lancio in tutto);
- con omp Chat spento, si apre un terminale e nessuna conversazione.

## Punti del codice già noti

- Send to agent (`send`): `extension/src/host/design-requests.ts:134-147`, poi `deliver` a `:189-202`; comando `trama.sendDesignRequest` in `extension/src/host/main.ts:83`.
- Chiusura della scheda (`closed`, da `onDidChangeTabs` a `:75-79`): `extension/src/host/design-requests.ts:154-168`.
- + Add Work Item: webview `extension/src/webview/board/index.tsx:389` invia `writeDesignRequest` → `extension/src/host/controller.ts:1595` → `DesignRequests.write()`/`open()` in `extension/src/host/design-requests.ts:94-127`.
- Scelta del launcher: `extension/src/host/agent.ts:146-149` (`configuredOmpChat`/`ompChatInUse`).
- Ramo conversazione di `launchAgent`: `extension/src/host/agent.ts:783-801`; ramo terminale e fallback: `:802-834`.
- `openConversation`: `extension/src/host/agent.ts:169-178`; `openFocusedTerminal` (Ask more): `:844-889`.
- Apertura della conversazione: `extension/src/host/omp-chat/conversations.ts:178-209` (`open`).
- Avvio con limite di 30 s: `extension/src/host/omp-chat/client.ts:641-674`.
- Altri chiamanti di `launchAgent`: `extension/src/host/controller.ts:1439` e `:2475`.
- Test esistenti: `test/host-design-requests.test.ts` (lancio stubbato a `:383-392`, `:425`, `:572`); `test/host-agent-terminals.test.ts:3173` (omp Chat spento → terminale) e `:3186` (avvio fallito → terminale, nessuna conversazione).
