---
status: resolved
resolution: fix-code
refs:
  - question-round/On question
  - requirements/ui#question-round
proposal: null
task: zs3rdtoj
origin: null
option: 1
note: null
created: 2026-10-06T20:36:26.940Z
---
# Il focus esce dalle domande dopo una scelta da tastiera

## What happens

Con l’overlay aperto, se il developer porta il focus su una voce dell’indice e usa un tasto numerico per cambiare l’opzione della domanda corrente, la scelta cambia ma il focus lascia il dialogo. La domanda resta aperta; la navigazione da tastiera perde però il punto da cui il developer stava lavorando. Il comportamento è stato osservato nell’overlay del pannello con la prima domanda aperta, focus sulla prima voce dell’indice e tasto 1.

## What should happen

Finché l’overlay è aperto, il **focus deve restare al suo interno**. I tasti da 1 a 9 possono cambiare le opzioni quando il developer non sta scrivendo nella risposta libera, senza far uscire il focus dal dialogo. Quando cambia la domanda, il focus va sul suo testo; un semplice cambio di opzione non deve lasciare il developer senza un punto di navigazione nel round.

## Fix options

### Conservare il controllo su cui si sta lavorando

Dopo una scelta numerica, il focus rimane sulla stessa voce dell’indice o sullo stesso controllo dell’overlay. Il developer può proseguire da dove era senza ricominciare la navigazione. Quando il controllo non esiste più, il focus torna al testo della domanda corrente. Richiede conservare il punto di navigazione anche quando la presentazione viene aggiornata.

### Riportare il focus al testo della domanda

Dopo una scelta numerica che farebbe perdere il controllo attivo, il focus torna sempre al testo della domanda corrente. Il dialogo rimane interamente navigabile e non lascia il focus fuori. È una soluzione più semplice e uniforme, ma il developer deve ripercorrere i controlli per tornare al punto dell’indice o al pulsante su cui stava lavorando.

## Where in the code

extension/src/webview/questions/index.ts: aggiornamento dell’indice e ripristino del focus in mountQuestions. Riproduzione con extension/dist/harness.html#questions: focus sulla prima voce dell’indice, tasto 1; l’opzione cambia e il focus passa al corpo della pagina.
