---
column: done
technical: false
refs:
  - omp-chat-conversation
  - requirements/ui#omp-chat-conversation
  - requirements/rules#omp-chat-conversation
  - requirements/tech#omp-chat-conversation
  - requirements/data#omp-chat
  - requirements/tech#omp-chat
drift: null
proposal: srkyrbvl
agent: false
created: 2026-10-24T10:27:31.669Z
finished: 2026-10-24T10:45:47.957Z
---
# Steer e Queue

In ogni conversazione di omp Chat, General compresa, accanto a `Send` c'è un interruttore a due opzioni `Steer` e `Queue` che decide come arriva all'agente un messaggio mandato mentre lavora; oggi il developer vede che né lo steering né la coda funzionano, e va sistemato e verificato.

Questo Task implementa, delle sezioni nominate, tutto ciò che riguarda l'interruttore, la coda, lo steering e i loro messaggi. Delle sezioni `ui#omp-chat-conversation` e `tech#omp-chat` non implementa: la conversazione di Ask more vuota con il suo segnaposto, il primo messaggio senza istruzione visibile, `Send` disabilitato fino alla sessione aperta e il campo `placeholder` di `conversations` (li fa il Task `Ask more vuota`); i loghi delle chiamate e la dipendenza `simple-icons` (li fa il Task `Loghi nella chat`). Le tabelle nei messaggi dell'agente non chiedono nulla qui: arrivano dal renderer Markdown condiviso del pannello, cambiato da un altro Task, e la chat lo usa già.

Quando è fatto:
- Interfaccia: accanto a `Send`, sempre visibile, un gruppo di scelta singola con nome accessibile `When the agent is working`, con `Steer` e `Queue` entrambe scritte, la scelta piena e l'altra attenuata, raggiungibile da tastiera con l'anello del fuoco. La scelta è una sola per tutte le conversazioni di ogni finestra; cambiarla in una la cambia in tutte; resta dopo una ricarica; all'inizio è `Steer`. Vale solo per i messaggi mandati mentre l'agente lavora: a un agente fermo il messaggio parte come sempre con `session/prompt`. Testi in inglese, non seguono `trama.language`.
- Dati: la scelta sta in `ExtensionContext.globalState` sotto la chiave `trama.ompChatSendMode`, valore `steer` o `queue`; assente o con un altro valore vale `steer`; si scrive a ogni cambio; mai nel repository né in `contributes.configuration`, e non compare nella scheda Settings. I messaggi in coda non si salvano: vivono nella memoria dell'host.
- Messaggi host → webview: `sendMode { mode: "steer" | "queue" }` all'avvio della vista e a ogni cambio; `messageStatus { id, messageId, status: "queued" | "delivered" | "failed", reason?: string }` per i messaggi mandati mentre l'agente lavora. Webview → host: `sendMessage { id, text, messageId }` (il webview genera `messageId` per ogni messaggio) e `setSendMode { mode }`, che l'host salva e a cui risponde rimandando `sendMode`. Ogni messaggio dal webview è validato con zod in `extension/src/host/omp-chat/messages.ts` e ignorato se non valido.
- Invio (`extension/src/host/omp-chat/client.ts`): con `_meta.steering.supported` dichiarato da omp in `initialize` (`steeringSupported` in `src/core/omp-acp.ts`), un messaggio mandato mentre l'agente lavora va con `_session/steering`: con `Steer` senza `_meta`, con `Queue` con `_meta: { steering: { queue: "followUp" } }`. Risposta `injected` → con `Steer` `delivered` subito, con `Queue` `queued` finché la sessione non mostra il messaggio consegnato (notifica del messaggio dell'utente o inizio del turno che gli risponde), poi `delivered`; `promptRequired` → il turno è finito, l'host lo manda come `session/prompt` e lo segna `delivered`; `failed` o un errore → `failed` con il motivo. Senza `_meta.steering.supported` ogni messaggio, con qualunque scelta, è `queued` e parte come prompt successivo alla fine del turno. Più messaggi in coda arrivano nell'ordine di invio; cambiare la scelta vale solo per i messaggi mandati dopo.
- Permesso: mentre una richiesta di permesso aspetta, l'host non manda nulla a omp (uno steering la annullerebbe), anche con `Steer`: tiene il messaggio, lo segna `queued`, non risponde alla richiesta e non la annulla, e lo manda come `followUp` subito dopo la risposta del developer alla richiesta, qualunque sia la scelta.
- Stop, la chiusura della conversazione e la chiusura della finestra scartano i messaggi ancora tenuti dall'host; una coda già consegnata a omp segue omp.
- Vista (`extension/src/webview/omp-chat/`, `state.ts:sendMessage`, `conversation.tsx`): un messaggio `queued` mostra sotto il suo riquadro, in testo secondario, l'icona lucide `Clock` e `Queued`, che sparisce a `delivered`; un messaggio `failed` mostra al suo posto, nel colore di errore, `Not delivered: <motivo>.`.
- Verifica: con omp 18.12.6, con un test d'integrazione o una prova a mano annotata in `docs/uat.md`, un messaggio con `Steer` arriva davvero all'agente durante il turno e uno con `Queue` arriva alla fine del turno, che continua per rispondergli. Se la causa del mancato steering di oggi è nel client (per esempio il messaggio scritto mentre l'agente lavora non passa da `_session/steering`, o la risposta di omp è letta male), va corretta.
- Test `bun:test` della logica pura (stato dei messaggi da risposta di omp, coda con permesso in attesa, lettura del valore salvato) e un test del webview per l'interruttore e le righe `Queued` / `Not delivered`.
