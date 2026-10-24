---
refs:
  - agent-terminal
  - announcement
  - agent-hook
  - agent-launching
  - requirements/rules#agent-terminal
  - requirements/tech#agent-terminal
  - requirements/tech#agent-launching
  - requirements/rules#developer.ASK_MORE
  - requirements/tech#developer.ASK_MORE
  - requirements/ui#developer.ASK_MORE
  - requirements/ui#announcement
---

# Ask more senza il Quick terminal

Quando il Task è finito il Quick terminal non esiste più: nessun terminale né conversazione di omp Chat chiamati `Quick`, nessun ghost di lavoro o annuncio `Quick`, e l'elenco dei ghost (`requirements/ui#announcement`) non lo nomina più. In particolare sparisce il testo speciale del ghost di lavoro intitolato `Quick` in `extension/src/webview/board/logic.ts` (~674, «A free chat with the agent…»), con i test relativi in `test/board-logic.test.ts`.

Ask more mantiene esattamente il comportamento che aveva, ora descritto da solo e non più "come Quick": apre un terminale (o, con omp Chat in uso, una conversazione) che prende il focus; senza hook; sul modello del ruolo di analisi (`trama.analysis`); con le istruzioni fisse di Ask more allegate con `@` e come sola frase aggiunta quella della lingua; un ghost di lavoro chiamato come il suo terminale, con l'aspetto del ghost di import; finisce quando omp esce, il terminale o la conversazione si chiude, o al controllo di esecuzione, senza avvisi; le card che consegna non aspettano la fine del turno; i suoi annunci in sospeso vengono ritirati con l'avviso di consegna mancata alla fine del comando o alla chiusura. Prima del lancio resta il controllo di omp (`ompBeforeLaunch`), ora chiamato solo da Ask more e dai lanci di lavoro, non più da `openQuickTask`.

Il codice e i test di Ask more non devono più dipendere dagli helper di Quick (`openQuickTask`, `quickOptions`, `quickCommandLine`), che il Task della Board rimuove insieme al comando Add Quick Task, al messaggio `openQuickTask` e alla voce del menu di + Add Work Item. Questo Task dà ad Ask more le sue opzioni e la sua riga di comando proprie (`--model <m>` solo se il ruolo ha un modello, nessun hook, overlay, `--slow` o `--advisor`) in `extension/src/host/terminal-agent.ts` e le usa in `openAskMore` (`extension/src/host/agent.ts` ~662-672) e in `openFocusedTerminal` (~623-654), aggiornando `test/host-terminal-agent.test.ts` e `test/host-agent-terminals.test.ts`; aggiorna anche i commenti che citano Quick Task (`extension/src/host/omp-launch.ts` ~37, `extension/src/host/omp-chat/conversations.ts` ~81-83 e ~207).

Il testo di `agent-launching` dice ora che la conversazione General sostituisce Quick Task come chat semplice; General usa solo la ricerca del programma omp, senza il controllo prima del lancio di Ask more. General stessa (avvio, modello, cancellazione) appartiene a un altro Task. Per `agent-hook` cambia solo il testo: le conversazioni di Ask more e di General non hanno hook; nel modulo dell'hook non c'è nulla da cambiare, salvo eventuali menzioni di Quick nel codice.
