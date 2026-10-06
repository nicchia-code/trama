---
column: done
technical: false
refs:
  - question-round/On question
  - requirements/ui#question-round
drift: iq3s6x3v
proposal: null
agent: false
created: 2026-10-06T20:47:03.326Z
finished: 2026-10-06T20:49:56.031Z
---
# Fix code to match the Model: Il focus esce dalle domande dopo una scelta da tastiera

## What happens

Con l’overlay aperto, se il developer porta il focus su una voce dell’indice e usa un tasto numerico per cambiare l’opzione della domanda corrente, la scelta cambia ma il focus lascia il dialogo. La domanda resta aperta; la navigazione da tastiera perde però il punto da cui il developer stava lavorando. Il comportamento è stato osservato nell’overlay del pannello con la prima domanda aperta, focus sulla prima voce dell’indice e tasto 1.

## What should happen

Finché l’overlay è aperto, il **focus deve restare al suo interno**. I tasti da 1 a 9 possono cambiare le opzioni quando il developer non sta scrivendo nella risposta libera, senza far uscire il focus dal dialogo. Quando cambia la domanda, il focus va sul suo testo; un semplice cambio di opzione non deve lasciare il developer senza un punto di navigazione nel round.

## Chosen option

**Conservare il controllo su cui si sta lavorando**

Dopo una scelta numerica, il focus rimane sulla stessa voce dell’indice o sullo stesso controllo dell’overlay. Il developer può proseguire da dove era senza ricominciare la navigazione. Quando il controllo non esiste più, il focus torna al testo della domanda corrente. Richiede conservare il punto di navigazione anche quando la presentazione viene aggiornata.

## Where in the code

extension/src/webview/questions/index.ts: aggiornamento dell’indice e ripristino del focus in mountQuestions. Riproduzione con extension/dist/harness.html#questions: focus sulla prima voce dell’indice, tasto 1; l’opzione cambia e il focus passa al corpo della pagina.
