---
column: done
technical: false
refs:
  - announcement
  - requirements/ui#announcement
drift: null
proposal: nr388hz3
agent: false
created: 2026-10-23T14:00:42.300Z
finished: 2026-10-23T18:31:25.976Z
---
# Ritiro annunci senza chat

Un annuncio Announced è ritirato, con l'avviso che l'agente ha finito senza consegnare, solo dai segnali del suo terminale: `agent-hook.IDLE`, `terminal.COMMAND_ENDED` del comando scritto da Trama, `terminal.CLOSED`, e `time.CHECK_DUE` quando il controllo di esecuzione chiude quel terminale; `developer.DISCARD_PROPOSAL` lo ritira senza avviso. Un lavoro (Al lavoro) è consegnato senza avviso dagli stessi segnali del suo terminale. Non esistono più ritiri o consegne per la fine, l'interruzione o la chiusura di una conversazione della chat dell'editor, né il caso del lavoro della chat mai legato alla sua conversazione: nessun ghost sparisce in silenzio per questi motivi. L'elemento della barra di stato dei ghost senza colonna non nomina più Cursor. Gli annunci fatti al lancio non hanno rami per Cursor: appartengono al terminale in cui Trama scrive l'istruzione, o a quello sostituito dalla conversazione di omp Chat.

Codice da togliere (indicazioni): in `extension/src/host/announcements.ts` `onCursorChat` e l'import di `onCursorChatEvent` da `./cursor`, e in `withdrawForCheck` il ramo per conversazione e quello del lavoro mai legato (resta il ritiro degli annunci del terminale chiuso dal controllo); i collegamenti a questi in `extension/src/host/agent.ts` e `extension/src/host/drift-resolution.ts` (legame lavoro–conversazione per gli annunci). Commenti che parlano di conversazione o chat del progetto vanno riscritti.

Test: togliere i casi di ritiro per eventi della chat di Cursor e per il lavoro mai legato (`test/cursor-chat.test.ts`, `test/host-drift-resolution.test.ts`, `test/host-agent-terminals.test.ts`, `test/host-task-check.test.ts`, per le parti sugli annunci) e mantenere quelli dei segnali di terminale e del controllo di esecuzione.
