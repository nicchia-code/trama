---
status: approved
base:
  agent-launching/omp-chat-conversation.md: 7acb1e6bf3d89424358cbd17cb6581edb9fa0d80332c86cd38867509aabb8512
  requirements/ui/omp-chat-conversation.md: 4eebd5b8160fa38fd4f9e3d0d8e31f0becdcbb46734c3fba49351c48691ee9b7
  requirements/tech/omp-chat-conversation.md: 369f575aabdf63cd0e076e1ab363262422015bc5e44faa56aa374d1e7237799f
delete: []
request: 2026-10-24T16-12-00
created: 2026-10-24T14:20:58.126Z
label: omp Chat
---
# Chiamate lunghe apribili

In omp Chat il titolo di una chiamata a uno strumento è tagliato con `…` quando non entra nella riga, e oggi la riga non si apre: il developer non può leggere un comando lungo per intero. Questa modifica rende apribili le chiamate tagliate, per mostrare il comando intero e nient'altro.

Decisioni:
- Si apre ogni chiamata il cui titolo è tagliato, non solo i comandi: comandi della shell, celle di codice e anche letture, ricerche, modifiche e sotto-agenti.
- Una riga è apribile solo quando il suo testo non entra nella riga o ha più righe; una riga che entra intera resta una riga che non si clicca.
- Il testo intero si apre sotto la riga, nella conversazione, in un riquadro a spaziatura fissa e a capo, come l'allegato dell'istruzione; un testo molto lungo scorre nel riquadro. Un altro clic lo richiude.
- Per un comando della shell e per le celle di codice il riquadro mostra il comando esattamente come l'agente lo ha scritto, dagli argomenti interi della chiamata (anche oltre il taglio di omp a circa 4000 caratteri); il titolo di omp solo quando gli argomenti mancano. Per le altre chiamate mostra il titolo intero.
- Celle di codice: ogni cella con una riga d'intestazione (linguaggio e titolo) e sotto il suo codice.
- Solo il comando: il riquadro non mostra mai l'esito o l'output della chiamata; la riga d'errore di una chiamata fallita resta com'è.
- Anche la riga della chiamata dentro una richiesta di permesso di omp si apre, così il developer legge il comando intero prima di consentirlo.
- Nessun pulsante per copiare: il testo aperto si seleziona e si copia a mano.
- Le chiamate aperte non si ricordano: dopo una ricarica della finestra tornano tutte chiuse.

Scelte dell'agente, da controllare:
- La riga tagliata ha il chevron `ChevronRight`/`ChevronDown` a sinistra dell'icona, come l'allegato dell'istruzione e il ragionamento, e si apre anche da tastiera (`Enter`, `Space`).
- Il titolo di una riga apribile resta selezionabile: un clic che chiude una selezione di testo non apre né chiude la riga.
- Una riga aperta resta aperta, e richiudibile, anche se poi entrerebbe intera; lo stato aperto sopravvive al cambio di scheda della conversazione.
- Il comando intero di shell e celle viene dagli argomenti della chiamata che omp manda già al webview: nessun messaggio nuovo fra host e webview.
