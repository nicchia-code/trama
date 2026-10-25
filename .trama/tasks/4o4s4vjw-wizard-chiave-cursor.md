---
column: done
technical: false
refs:
  - setup-wizard/omp
drift: null
proposal: nrtibou1
agent: false
created: 2026-10-25T02:30:05.354Z
finished: 2026-10-25T02:46:00.743Z
---
# Chiave Cursor nel wizard

Nel passo `omp` del wizard di configurazione la riga di Cursor della sezione Providers offre la chiave API come nella scheda Settings, perché la sezione è lo stesso componente: "Set API key" senza chiave salvata, "Change API key" con una chiave salvata, e solo con una chiave salvata anche "Remove API key". L'aspetto della riga ("API key saved" sotto il piano, testo del piano "Cursor subscription or API key") è definito per il componente condiviso; qui conta il comportamento del passo. I pulsanti agiscono solo quando omp risponde.

Set/Change API key: la webview invia al host il messaggio `setCursorApiKey` con il percorso di omp del passo (`ompPath`, come per `ompLogin`). Il host apre la casella mascherata dell'editor e salva subito la chiave nel portachiavi dell'editor; la chiave non passa mai dalla webview. Dopo il salvataggio il passo verifica omp di nuovo con quel percorso, e quindi con la chiave nuova, aggiornando lo stato dei fornitori, il numero dei modelli e la riga di Cursor (il host comunica lo stato con `cursorApiKey { saved }`). Esc nella casella non cambia nulla. Se il portachiavi non riesce a salvarla, un errore dell'editor lo dice, nulla cambia e non c'è nuova verifica.

Remove API key: la webview invia `removeCursorApiKey` con lo stesso `ompPath`; la chiave è tolta subito, senza conferma, e il passo verifica omp di nuovo senza la chiave aggiornando fornitori, numero dei modelli e riga di Cursor. Se il portachiavi non riesce a toglierla, un errore dell'editor lo dice e nulla cambia.

Cambio da un'altra finestra dell'editor: quando il host segnala che la chiave è stata salvata, cambiata o tolta altrove, la riga di Cursor si aggiorna alla chiave di adesso e, se il wizard è sul passo `omp`, la webview invia di nuovo `agentCheckWanted` con il percorso di omp del passo, come se il cambio fosse avvenuto in questa finestra. La finestra che ha fatto il cambio verifica una sola volta.

In tutti e tre i casi le scelte del wizard restano come erano. La chiave non è una scelta del wizard: non compare nel riepilogo, la conferma del wizard non la scrive e Cancel non la toglie; resta salvata anche se il wizard è poi annullato. Una chiave di Cursor che dà a omp almeno un modello utilizzabile basta perché "Next" porti al passo Models, come qualsiasi altro fornitore.

Il salvataggio, la casella di input, i messaggi d'errore e l'ascolto dei cambi nel host sono coperti altrove; questo lavoro si appoggia a quei messaggi.
