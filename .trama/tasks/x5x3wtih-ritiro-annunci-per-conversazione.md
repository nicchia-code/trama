---
column: done
technical: false
refs:
  - announcement
  - requirements/rules#announcement
drift: null
proposal: n97kq4ls
agent: false
created: 2026-10-21T11:33:12.145Z
finished: 2026-10-21T11:46:50.189Z
---
# Ritiro annunci per conversazione

Un annuncio della chat appartiene alla sua conversazione di Trama, nello stesso modo in cui un annuncio del terminale appartiene al suo terminale. Il ritiro sui segnali della chat (in `src/core/announcements.ts` e nel punto in cui l'estensione riceve gli eventi degli hook di Cursor, `src/core/cursor-chat.ts` e `extension/src/host/`) segue queste regole:

- **Annuncio con `conversation`.** Lo fa l'agente della chat o un suo sotto-agente, oppure lo fa Trama lanciando l'istruzione che ha aperto quella conversazione, una volta che Trama l'ha riconosciuta. Lo ritirano, con l'avviso, solo la fine del turno (`editor-chat.AGENT_STOPPED`) e l'interruzione (`editor-chat.AGENT_INTERRUPTED`) di quella conversazione. La chiusura di quella conversazione (`editor-chat.CONVERSATION_CLOSED`) lo ritira senza avviso. Le altre conversazioni non lo toccano mai.
- **Annuncio con `chat` senza `conversation`.** Comprende quello di un agente che Trama non ha avviato (`chat: editor`) e quello che Trama fa al lancio prima di riconoscere la conversazione. Lo ritira, come oggi, la fine del turno, l'interruzione o la chiusura di una qualunque conversazione di Trama dello stesso progetto, oltre all'avvio dell'editor.
- **Lavoro.** Un lavoro lanciato nella chat finisce senza avviso con la fine, l'interruzione o la chiusura della sua conversazione. Finché Trama non l'ha riconosciuta, finisce con quelle di una qualunque conversazione di Trama del progetto.
- **Revisione finale dell'Advisor.** Una fine di turno che Trama continua con la revisione finale dell'Advisor della chat non ritira nulla: né annunci né lavori, e senza avviso. Ritira solo la fine di turno che chiude davvero il turno.
- **Nessun timer.** Un annuncio resta finché un segnale della sua conversazione, o di una qualunque conversazione per la chat del progetto, non lo ritira, oppure finché l'editor non riparte.

I controlli seguono l'Advisor Scanner con qualunque agente, sia omp sia la chat di Cursor. Quando l'Advisor Scanner è attivo il Run non annuncia il controllo del pre-flight, e il controllo finale passa da Verifying a History senza Scanning. Né l'advisor né le sue revisioni nella chat annunciano nulla. Le skill (`skills/trama-implement`) non legano più questo comportamento a omp. Anche la presa del controllo di scan di Trama vale per la stessa conversazione: dalla chat senza conversazione nota vale la chat del progetto, come prima.
