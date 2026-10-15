---
status: resolved
resolution: fix-code
refs:
  - question-round/Asking/editor.DISCONNECTED
  - requirements/rules#question-round
proposal: null
task: psyu63p0
origin: null
critical: false
option: 1
note: null
resolvedBy: zxoqdayf
created: 2026-10-14T12:20:43.957Z
---
# Il round di domande si interrompe quando il progetto scompare dalla finestra

## What happens

Se la cartella `.trama/` del progetto viene tolta mentre la finestra resta aperta, per esempio con un cambio di branch, la finestra smette di servire il progetto. Ogni round di domande in corso o in coda viene interrotto: le risposte già date vanno perse e l'agente riceve l'errore di editor perso, come se l'editor fosse stato chiuso.

## What should happen

Il Modello dice che un round si interrompe solo quando la finestra che lo serve viene persa. Una finestra ancora aperta dovrebbe poter completare il round in corso, e il developer dovrebbe poter rispondere; la scomparsa di `.trama/` non è una perdita dell'editor.

## Fix options

### Tenere il round finché la finestra è aperta

La finestra continua a mostrare il round in corso e a consegnarne le risposte anche se `.trama/` non c'è più. Le domande nuove per quel progetto restano non disponibili, come oggi senza progetto. Nulla di ciò che il developer ha scelto va perso. Costo: una finestra può restare a servire un round di un progetto che non si trova più, finché il developer risponde o la chiude.

### Dichiarare la scomparsa del progetto come interruzione

Il Modello e la documentazione delle domande dicono che la scomparsa di `.trama/` interrompe i round, come la perdita dell'editor. Il comportamento resta quello di oggi e l'agente riceve lo stesso errore. Costo: una modifica alla cartella, anche un cambio di branch, può far perdere le risposte, e vanno aggiornati Modello, Requisiti e docs/cli.md.

## Where in the code

`extension/src/host/questions.ts`: `EditorQuestions.refresh` chiude il servizio della finestra quando il progetto non si trova più, e il watcher di `.trama` (`onDidDelete`) lo richiama.
