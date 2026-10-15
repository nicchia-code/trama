---
column: done
technical: false
refs:
  - question-round/Asking/editor.DISCONNECTED
  - requirements/rules#question-round
drift: 3erbcpqf
proposal: null
agent: false
created: 2026-10-14T12:26:20.152Z
finished: 2026-10-14T12:29:32.286Z
---
# Fix code to match the Model: Il round di domande si interrompe quando il progetto scompare dalla finestra

## What happens

Se la cartella `.trama/` del progetto viene tolta mentre la finestra resta aperta, per esempio con un cambio di branch, la finestra smette di servire il progetto. Ogni round di domande in corso o in coda viene interrotto: le risposte già date vanno perse e l'agente riceve l'errore di editor perso, come se l'editor fosse stato chiuso.

## What should happen

Il Modello dice che un round si interrompe solo quando la finestra che lo serve viene persa. Una finestra ancora aperta dovrebbe poter completare il round in corso, e il developer dovrebbe poter rispondere; la scomparsa di `.trama/` non è una perdita dell'editor.

## Chosen option

**Tenere il round finché la finestra è aperta**

La finestra continua a mostrare il round in corso e a consegnarne le risposte anche se `.trama/` non c'è più. Le domande nuove per quel progetto restano non disponibili, come oggi senza progetto. Nulla di ciò che il developer ha scelto va perso. Costo: una finestra può restare a servire un round di un progetto che non si trova più, finché il developer risponde o la chiude.

## Where in the code

`extension/src/host/questions.ts`: `EditorQuestions.refresh` chiude il servizio della finestra quando il progetto non si trova più, e il watcher di `.trama` (`onDidDelete`) lo richiama.
