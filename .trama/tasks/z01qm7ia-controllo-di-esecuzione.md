---
column: done
technical: false
refs:
  - time
  - agent-launching
  - requirements/rules#time
  - requirements/tech#time
drift: null
proposal: u4osxzox
agent: false
created: 2026-10-21T15:20:49.406Z
finished: 2026-10-21T15:34:57.802Z
---
# Controllo di esecuzione

Ogni finestra dell'editor ha il suo controllo di esecuzione, l'Event `time.CHECK_DUE`: scatta una volta quando la finestra apre il progetto, dopo il ritiro degli annunci rimasti su disco, e poi ogni minuto, ma solo mentre la finestra ha almeno un lavoro in corso nel suo registro o il progetto ha almeno un Task preso dall'agente. A riposo non scatta; due controlli non si sovrappongono; l'intervallo non è un'impostazione.

Il controllo guarda soltanto fatti certi e mai l'attività, l'output, i comandi di Trama, il progresso o il tempo dall'ultimo segnale: un agente vivo ma fermo resta in corso. Per un terminale di omp verifica che esista ancora il processo che l'hook ha indicato o, senza, la shell del terminale, e che il terminale esista ancora, con `process.kill(pid, 0)` e senza lanciare nessun processo. Per la chat di Cursor chiude come mai partito un lavoro che al controllo, almeno 60 secondi dopo l'invio, non è ancora legato alla sua conversazione. Cerca i Task presi da un terminale o una conversazione che nessuna finestra aperta del progetto segue, chiedendolo alle altre finestre sul canale locale, con le regole di `rules#time`.

La decisione (quali lavori chiudere, quali Task liberare, con quale motivo) è una funzione pura in `src/core`, testata con `bun:test`; l'host raccoglie i fatti e applica le conseguenze con le funzioni di fine che già usa, come una fine anomala, e manda al webview l'avviso del controllo. Un controllo che non trova nulla non scrive nulla e non mostra nulla. La descrizione della Feature Agent launching resta vera: la fine del lavoro la dicono l'hook, il comando, il terminale, la conversazione e, quando un segnale si perde, questo controllo; l'agente principale può chiedere della salute di chi tiene un Task senza aspettare il minuto.
