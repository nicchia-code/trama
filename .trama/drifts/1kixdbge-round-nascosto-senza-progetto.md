---
status: resolved
resolution: proposal
refs:
  - question-round/Out of sight/developer.OPEN_PANEL
  - requirements/rules#question-round
proposal: null
task: null
origin: null
previous: qbqvegxv
critical: false
option: null
note: null
resolvedBy: 420v7dly
created: 2026-10-18T10:09:18.858Z
---
# Round nascosto senza progetto

## What happens

Con un round di domande in corso, se la cartella del progetto viene tolta dallo spazio di lavoro mentre la finestra resta aperta, il round non compare più. Né il pannello né Reopen né il comando per aprirlo mostrano le domande: il pannello si apre senza il round e il developer non può rispondere, mentre l'agente continua ad aspettare.

## What should happen

Il Modello dice che il developer riapre il pannello e l'overlay torna sulla domanda o sul riepilogo che mostrava. La decisione già presa su questo caso dice che le domande non dipendono dal progetto e che il round si mostra anche senza progetto. Resta separato il caso di un altro progetto nella stessa finestra: lì il round aspetta il suo progetto e non compare.

## Fix options

### Mostrare il round anche senza progetto

Quando la finestra non ha più un progetto, il round in corso resta visibile sul pannello con le sue risposte, e Reopen riporta l'overlay. Il pannello senza progetto mostra solo le domande e lo dice. Un round di un progetto non compare mai in una finestra su un altro progetto. Costo: il round può restare davanti a un pannello senza progetto finché il developer risponde.

### Ricordare il progetto del round

La finestra ricorda il progetto a cui appartiene il round in corso e continua a mostrarlo anche quando il progetto non c'è più, finché non ne apre un altro. Senza progetto il round resta visibile sopra la schermata di avvio; con un progetto diverso resta nascosto come oggi. Costo: la finestra conserva un progetto ricordato anche quando non ne ha uno, e le due regole vanno tenute distinte.

## Where in the code

extension/src/host/question-session.ts: shownRound, che mostra il round solo se il suo progetto è quello attuale della finestra, e setProject; extension/src/host/questions.ts: refresh, che passa alla sessione un progetto assente quando la cartella scompare; extension/src/host/controller.ts: revealForQuestions e open, che aprono il pannello senza mostrare il round.
