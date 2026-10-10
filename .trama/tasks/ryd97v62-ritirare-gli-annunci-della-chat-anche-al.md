---
column: done
technical: false
refs:
  - announcement/Announced/editor-chat.AGENT_STOPPED
  - announcement/Announced/editor-chat.AGENT_INTERRUPTED
  - announcement/Announced/editor-chat.CONVERSATION_CLOSED
  - requirements/data#announcement
  - requirements/rules#announcement
  - requirements/tech#announcement
drift: null
proposal: u064bqz0
agent: false
created: 2026-10-10T12:48:19.941Z
finished: 2026-10-10T14:24:07.226Z
---
# Ritirare gli annunci della chat anche alla fine normale del turno

Ogni nuovo annuncio privo di TRAMA_TERMINAL appartiene alla chat del progetto: porta chat: cursor con CURSOR_AGENT=1, altrimenti chat: editor. Entrambe le provenienze devono restare leggibili, anche per gli annunci di controlli e per il ghost creato automaticamente quando inizia una Proposal; gli annunci precedenti privi di chat non vengono retroattivamente attribuiti alla chat. Alla conclusione normale del turno di una conversazione di Trama dello stesso progetto (editor-chat.AGENT_STOPPED), tutti i suoi annunci ancora in attesa vengono ritirati immediatamente e il developer riceve l’avviso di mancata consegna, oppure di controllo non terminato per un check. L’interruzione mantiene lo stesso ritiro con avviso; la chiusura della conversazione ritira senza avviso. Tutti e tre gli eventi trattano allo stesso modo chat: cursor e chat: editor, senza toccare annunci di terminali o di altri progetti. Se il lavoro riprende dopo una risposta a testo, l’agente annuncia di nuovo quanto deve archiviare.
