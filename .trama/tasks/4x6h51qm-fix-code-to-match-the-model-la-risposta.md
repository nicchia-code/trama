---
column: done
technical: false
refs:
  - question-round/On question
  - requirements/rules#question-round
  - requirements/ui#question-round
drift: 4z2gexfz
proposal: null
agent: false
created: 2026-10-06T18:56:51.898Z
finished: 2026-10-06T19:05:08.051Z
---
# Fix code to match the Model: La risposta libera resta non confermabile dopo aver deselezionato le opzioni

## What happens

Dopo aver deselezionato l'opzione raccomandata, il developer scrive una **risposta libera non vuota**, ma Next o Review resta disabilitato. Il round non consente quindi di confermare normalmente una risposta solo testuale; tornare sulla domanda o cambiare ancora una scelta può aggirare il blocco.

## What should happen

Una domanda si può confermare con almeno un'opzione **oppure un testo libero non vuoto**, o entrambi. Next e Review devono essere abilitati appena esiste una risposta valida e disabilitati solo quando non ci sono scelte né testo non vuoto.

## Chosen option

**Allineare la conferma alla risposta corrente**

Ricalcolare l'abilitazione di Next e Review sulla scelta e sul testo effettivamente mostrati, anche dopo ogni modifica alle opzioni. Il developer può così deselezionare tutte le scelte e confermare immediatamente il solo testo; cancellarlo rende nuovamente impossibile una conferma vuota. Mantiene invariati il Modello e il formato delle risposte, con una correzione circoscritta all'overlay.

## Where in the code

extension/src/webview/questions/index.ts: renderQuestion, aggiornamento del pulsante principale e riuso dell'area di testo
