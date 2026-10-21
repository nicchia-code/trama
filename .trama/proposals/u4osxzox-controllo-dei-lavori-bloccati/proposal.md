---
status: approved
base:
  actors/time.md: new
  actors/agent-hook.md: ce7c63960b8af8cd5d2c7a48dd0ad9a51a6cc461e798c2327b90f7b3414a91c4
  actors/agent.md: 3deabff17c1362a677941008ca02f6b294b35757de2508422c32ff2cd520813c
  actors/editor-chat.md: 85dab13abb78d37e510fefc80de76bf137b4c6b43904e5f49ea2b524f4ad9ba6
  agent-launching/agent-terminal.md: 0ce783fc30c2b9492ed66e5ae90568e541582cbe9052e61718c105780b988589
  agent-launching/drift-resolution.md: 66f7e5ef4b2b22ec933c90f9d0474e0d9267959be9be034a4db5971db9037c40
  agent-launching/feature.md: 2a1a601861efad646838242dec0a1e42068db5a12b90266fc33f922a65e77310
  work/task.md: c565b9080e6b6a1b981c24cfa701cd619ce5421003f2877eb0c1b472dd0b1e52
  work/announcement.md: 84273657cb57b1e7d330fa36ed95cc63c4e1c40d1a89b634fd6123cc26f36732
  editor-panel/panel.md: b51129309d52a00c4cc4fe07d843232c69bd30eea6bad28770a5dbe63be24453
  requirements/rules/agent-terminal.md: 0160d148909c752304d940055e047fad3fac11f7fca899d37498f6c39308fac6
  requirements/rules/announcements.md: 71d18f3a7a44538644b33d4f0e5dcaa66d37545febd80bee3ab15248ee5cb5c2
  requirements/rules/drift-resolution.md: e27b81dbd5f9d993abb68b7868c3819724b70cabf3c250b3f348cb629fc7d860
  requirements/rules/models.md: a77406db3ddc0cad9fbde0d779341cc552d82f8cca6993738d77bee0778b274e
  requirements/rules/turn-history.md: e4a65044c52f09b4483f0618a5de803607f8553e83698c938bdec7e4d8763de7
  requirements/rules/execution-check.md: new
  requirements/tech/agent-hooks.md: 793ee636cb3dcfd08832ffc54467d09f2ca8661b4b8b4d7c821ba9b012f304cc
  requirements/tech/announcements.md: 73cc9644f97a36e041c818a1bced83b8fa8c6c6e9d38687eb16374453544e58a
  requirements/tech/editor-chat.md: a70286f5316e38ea9d0cbb6edc0f5e55964a43e91b97473bdefbaf1aa16811f4
  requirements/tech/models.md: d41a986bbceb82de4255d822a791d20df5dcfdab1752af9efe336dc032bd4361
  requirements/tech/execution-check.md: new
  requirements/cli/main.md: b12e6171266bf7472b33b866216e20dd6e34c46fcfca00c4a87979acc133efc8
  requirements/data/agents.md: ba325cca072b18e4843fae9ce712d7c22a044f5de29a08500b0e42226087b4ea
  requirements/ui/ghosts.md: 4bdf464057acb954f1b203b4955744a4b2a0c145045c60147e1321bc4e148da9
  requirements/ui/agents.md: 714bb26f323fb9bab05f934d7aa997f1df6cb0d6fa16a5754934e5366e315b85
  requirements/quality/agents.md: e4eb48c5f7559913522a39b9b4df154036f982f4d8ff1ba8ef157c3fb5f1f1e6
delete: []
request: 2026-10-21T16-49-24
created: 2026-10-21T15:01:18.534Z
label: Controllo esecuzione
---
# Controllo dei lavori bloccati

I lavori di Trama ogni tanto restano bloccati: oggi un Run, un design, uno scan, una risoluzione o un import finiscono solo con un segnale (hook a riposo, fine del comando, chiusura del terminale, fine o interruzione del turno della chat), e se il segnale si perde restano in corso il lavoro, i ghost e i Task presi, con `Run all` e `Resolve` disabilitati, fino alla chiusura a mano o al riavvio dell'editor; dopo un riavvio i Task presi restano presi. Questa Proposal aggiunge un controllo di esecuzione piccolissimo ed economico, ogni minuto, che guarda solo fatti certi.

## Decisioni

- Il controllo riconosce solo fatti certi: processo di omp morto, terminale sparito, lavoro della chat mai legato a una conversazione, Task preso che nessuna finestra segue. Nessuna quiete, nessuna soglia di inattività: un agente vivo ma fermo non è riconosciuto.
- Un lavoro trovato bloccato finisce come una fine anomala (Run finito, Task presi in To do, ghost ritirati con l'avviso di sempre, terminale chiuso con `trama.autoExit`, sequenza di `Run all` ferma) e in cima alla Board compare un avviso.
- Controlla i terminali di omp e i lavori della chat di Cursor.
- Per omp l'hook comunica all'avvio il processo di omp; il controllo verifica solo che esista, senza lanciare processi. Senza hook guarda il processo della shell del terminale.
- I Task presi da un terminale o una conversazione che nessuna finestra aperta del progetto segue tornano in To do; le finestre si chiedono a vicenda chi seguono.
- Il controllo gira ogni minuto, solo mentre la finestra ha un lavoro in corso o il progetto ha un Task preso, e una volta all'apertura della finestra.
- L'agente orchestratore può chiedere della salute di chi tiene un Task, con il comando nuovo `trama task check <id>`: Trama fa subito il controllo e, se chi lo tiene non è vivo, il Task torna in To do.
- Chat di Cursor: un lavoro ancora senza conversazione al primo controllo almeno un minuto dopo l'invio finisce come mai partito; `sessionEnd` con motivo `aborted` o `error` conta come interruzione del turno.
- L'avviso sta in cima alla Board, uno per lavoro, nello stile dell'avviso dell'Advisor, con `Close`: `Trama stopped following <lavoro>: <motivo>.`
- Un Task preso senza un terminale o una conversazione di Trama noti (agente avviato a mano) non è mai liberato dal controllo.
- Dopo un ricaricamento della finestra il processo di omp è ricordato fuori dal repository, nella memoria locale dell'utente: un Task si libera solo se nessuna finestra segue il suo terminale e quel processo non esiste più.
- Il Task liberato da `trama task check` torna in To do; l'agente lo prende poi con il solito `task move <id> doing`.
- La skill `trama-implement` chiede prima di chiudere la corsa, quando non resta nessun Task eseguibile e nel suo ambito restano Task In progress presi da altri.
- Senza un editor del progetto raggiungibile `trama task check` risponde che non può verificare e non cambia nulla.

## Scelte dell'agente, da verificare

- Una finestra aperta che non risponde in tempo alla domanda "chi segui?" conta come se seguisse il Task, che resta preso fino al controllo successivo; una finestra che non esiste più non segue nulla.
- Un file dei processi di omp che esiste ma non si legge non libera nessun Task di un terminale; un identificativo di processo riusato da un altro programma fa sembrare vivo l'agente (si sbaglia solo dal lato sicuro).
- Il lavoro della chat mai legato toglie solo l'annuncio fatto da Trama al suo lancio, senza l'avviso di mancata consegna; resta l'avviso del controllo.
- Un turno della chat salvato soltanto da `sessionEnd` mostra anche l'avviso `Trama stopped following <lavoro>: Cursor ended the session (<motivo>).`.
- L'hook di omp manda `trama hook start <pid>` alla prima `session_start` della sessione principale (o, se non arriva, al primo `agent_start`): va verificato con omp 18.12.
- Il controllo è un `setTimeout` riarmato, non un `setInterval`, e la decisione è una funzione pura in `src/core`.

## Already present

- `chat-advisor/Al lavoro/editor-chat.AGENT_INTERRUPTED` — `extension/src/host/drift-resolution.ts` (`AGENT_INTERRUPTED` in the chat event switch, `finishAgent`, ~653-663)
- `chat-advisor/Revisione del Task/editor-chat.AGENT_INTERRUPTED` — `extension/src/host/drift-resolution.ts` (same switch over `watched`, ~653-663)
- `chat-advisor/Correzione del Task/editor-chat.AGENT_INTERRUPTED` — `extension/src/host/drift-resolution.ts` (same switch, ~653-663)
- `chat-advisor/Revisione finale/editor-chat.AGENT_INTERRUPTED` — `extension/src/host/drift-resolution.ts` (same switch, `the run was interrupted`, ~663)
- `chat-advisor/Correzione finale/editor-chat.AGENT_INTERRUPTED` — `extension/src/host/drift-resolution.ts` (same switch, ~653-663)
- `task/Taken by the agent/editor-chat.AGENT_INTERRUPTED` — `extension/src/host/agent.ts` (`watchAgentTerminal`, `releaseTakenTasks` on chat turn ends, ~119-122)
- `panel/Open/developer.SHOW_BOARD` — `extension/src/webview/shell.tsx` (Board tab, ~49) and `extension/src/webview/main.tsx` (`mountBoard`, ~59)
