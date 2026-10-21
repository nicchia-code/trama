---
column: done
technical: false
refs:
  - announcement
  - requirements/tech#announcement
  - requirements/rules#announcement
  - requirements/data#announcement
drift: null
proposal: 2oj2rgp7
agent: false
created: 2026-10-21T04:57:27.914Z
finished: 2026-10-21T04:59:29.356Z
---
# Annunci solo con Cursor

Quando il Task è fatto, gli annunci che l'estensione scrive al lancio (Proposal di un design o di Resolve Drifts, controllo di uno scan, lavoro di un import) hanno `terminal` del terminale in cui Trama scrive l'istruzione oppure, con la chat di Cursor, `chat: cursor`; l'estensione non scrive mai un annuncio con `chat: editor`, perché fuori da Cursor con l'agente `cursor` nessun lavoro parte e nulla è annunciato. In `extension/src/host/agent.ts` la chiamata `announceSend(root, announceProposal, { chat: isCursor() ? "cursor" : "editor" })` passa sempre `chat: "cursor"` (il ramo fuori Cursor non arriva più lì); lo stesso vale per ogni altro punto di lancio che oggi sceglie `editor` fuori Cursor.

Il ritiro degli annunci con `chat` avviene solo per la fine del turno, l'interruzione o la chiusura di una conversazione di Trama del progetto nella chat di Cursor (con avviso nei primi due casi, senza nella chiusura), oltre che senza avviso all'avvio dell'editor. Non resta alcun ritiro specifico di Copilot: in `extension/src/host/announcements.ts` vanno tolti `onCopilotChat`, l'import di `CopilotChatEvent`/`onCopilotChatEvent` da `./copilot-chat` e l'iscrizione in `watchAnnouncements`, che restituisce solo il Disposable di `onCursorChatEvent`; vanno tolti o aggiornati i test che verificano il ritiro da Copilot.

`chat: editor` resta per gli annunci fatti da un agente che Trama non ha avviato (senza `TRAMA_TERMINAL` né `CURSOR_AGENT=1`): `Chat = "cursor" | "editor"` e `chatPlace`/la scelta del holder in `src/core/announcements.ts` restano, e il loro ritiro è invariato (li ritira ogni conversazione di Trama del progetto, come quelli con `cursor`, e l'avvio dell'editor). Il ghost può sparire mentre quell'agente lavora ancora; la scheda arriva comunque quando l'agente la archivia. Cambia solo la ragione dichiarata: i commenti che giustificano `editor` con Copilot (la chat di Copilot che non segna i comandi del suo agente) sono riscritti come «agente che Trama non ha avviato e che non dice da dove viene», in particolare in `src/core/announcements.ts` (commenti su `Chat`, sul tipo del luogo e sul campo `chat`), in `src/core/work.ts` (commenti sul holder `editor`) e nel commento di `src/cli/commands/drift.ts` alla riga del «Dismiss Drift» che parla di Copilot chat. Nessun annuncio esistente su disco va riscritto.
