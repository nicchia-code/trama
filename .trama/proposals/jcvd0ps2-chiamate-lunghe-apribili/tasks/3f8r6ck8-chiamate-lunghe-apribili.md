---
refs:
  - omp-chat-conversation
  - requirements/ui#omp-chat-conversation
  - requirements/tech#omp-chat-conversation
---
# Chiamate lunghe apribili

Nella conversazione di omp Chat ogni chiamata a uno strumento il cui titolo è tagliato si apre e si richiude con un clic, per leggere per intero ciò che l'agente fa con lei: un comando o del codice esattamente come l'agente li ha scritti, ogni altra chiamata con la sua descrizione intera, mai l'esito. Vale per ogni tipo di chiamata (shell, celle di codice, letture, ricerche, modifiche, sotto-agenti, altro), non solo per i comandi, e anche per la riga della chiamata dentro la richiesta di permesso di omp.

Quando il lavoro è finito vale quanto segue.

Quando una riga è apribile:
- Una riga è tagliata quando il titolo non entra nella larghezza della riga (`scrollWidth > clientWidth` sul titolo) o quando il testo da mostrare aperto ha più di una riga (contiene un a capo). Trama rimisura con un `ResizeObserver` quando la vista cambia larghezza (per esempio allargando o stringendo la barra laterale secondaria) e a ogni cambio del titolo.
- Una riga che entra intera non è un pulsante: non si clicca, non riceve il fuoco da tastiera, non ha chevron né `aria-expanded`. Una riga già aperta resta aperta anche se, dopo un allargamento, entrerebbe intera.
- Una riga tagliata è un `<button>` con `aria-expanded` e come nome accessibile il titolo; a sinistra dell'icona ha il chevron lucide `ChevronRight`, `ChevronDown` quando è aperta, come `Disclosure` (`extension/src/webview/omp-chat/blocks.tsx:21-32`). Si apre e si richiude con un clic, con `Enter` o con `Space`, e riceve il fuoco da tastiera con l'anello del fuoco. Il titolo resta selezionabile (`select-text`): un `click` con una selezione di testo non vuota dentro la riga (cioè il clic che chiude una selezione) non apre né chiude.

Cosa mostra una riga aperta:
- Sotto la riga, prima dei percorsi delle modifiche e della riga d'errore, un `<pre>` con il testo intero nello stile del testo dell'allegato dell'istruzione in `UserMessage` (`blocks.tsx:43-50`, `max-h-60 overflow-auto whitespace-pre-wrap`): spaziatura fissa, a capo dentro la larghezza della vista con le righe del testo come righe, stesso sfondo, e oltre l'altezza massima scorre in verticale dentro il riquadro; la conversazione non scorre mai di lato.
- Shell di omp (`bash`, `shell`, `exec`): il comando preso dagli argomenti interi della chiamata (`rawInput`), senza il `$ ` iniziale, anche oltre il taglio che il mapper ACP di omp applica al titolo (`limitText` a circa 4000 caratteri).
- Celle di codice (`eval`): le celle di `rawInput` nell'ordine, ognuna con una riga d'intestazione in testo secondario con il linguaggio fra parentesi quadre e il titolo della cella (per esempio `[py] Load settings`, solo `[py]` per una cella senza titolo) e sotto il suo codice.
- Ogni altra chiamata, o una shell/cella quando `rawInput` manca o non ha quella forma: il `title` intero che omp dà alla chiamata.
- Mai l'esito o l'output della chiamata, nemmeno aperta; la riga d'errore di una chiamata fallita resta com'è oggi. Nessun pulsante di copia: il testo nel riquadro è selezionabile.

Stato aperto:
- Più chiamate possono essere aperte insieme, ognuna per sé; ogni chiamata compare chiusa.
- Lo stato sta solo nel webview, per conversazione e per `toolCallId`: sopravvive al cambio di scheda, non va all'host né in `workspaceState`, e dopo una ricarica della finestra ogni chiamata torna chiusa.

Richiesta di permesso:
- La riga della chiamata in `Permission` (`blocks.tsx:116-142`, oggi `truncate` come `ToolCall`) si apre come nel flusso, quando è tagliata, con lo stesso riquadro sotto di lei e sopra i pulsanti, sia prima della scelta sia dopo, quando il riquadro è in sola lettura. Il testo intero viene dalla chiamata che omp allega alla richiesta (`addPermission`, `extension/src/webview/omp-chat/transcript.ts:138-144`), con le stesse regole.

Dove sta il codice:
- Il testo intero si calcola nel webview, senza nessun messaggio nuovo fra host e webview: l'host gira già ogni `SessionNotification` intera (`extension/src/host/omp-chat/view-model.ts:430`).
- Il blocco `tool` della trascrizione (`transcript.ts:18,23`) tiene, oltre al `title`, il testo da mostrare aperto, aggiornato in `applyUpdate` da `tool_call` e da ogni `tool_call_update` che porta `rawInput` (`transcript.ts:227-286`). Il calcolo è una funzione pura in `extension/src/webview/omp-chat/`, provata con `bun:test` (shell, celle con e senza titolo, `rawInput` assente o di forma diversa, comando oltre 4000 caratteri). Le celle restano strutturate (linguaggio, titolo, codice) perché il webview disegni le intestazioni in testo secondario.
- `ToolCall` (`blocks.tsx:98-113`, titolo oggi in `<span className="truncate select-text">`) e la riga di `Permission` condividono la stessa riga apribile. Il titolo della riga chiusa resta quello di oggi, con `toolLabel` (`extension/src/webview/omp-chat/tool-logo.ts:78-85`) e i loghi invariati.
- I test del webview che oggi vietano righe di chiamata cliccabili (`test/omp-chat-webview.test.tsx:134-137`) vanno aggiornati: una riga che entra non è un pulsante; una riga tagliata è un pulsante con `aria-expanded` che apre il riquadro con il testo intero e senza l'esito, anche nella richiesta di permesso.
