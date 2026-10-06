---
column: done
technical: false
refs:
  - worktree-round/Waiting
drift: agz47cox
proposal: null
agent: false
created: 2026-10-06T13:34:30.644Z
---
# Fix code to match the Model: Il giro in attesa non ha una Transizione verso Conflict quando il branch è andato avanti sulle stesse righe

## What happens

Ora, quando la cartella torna pulita sul branch di partenza, Trama unisce prima il commit nuovo del branch **nel worktree di merge**: se non ci sono conflitti la cartella si aggiorna senza merge vero e il giro va in No round. Se invece il commit nuovo tocca le stesse righe, Trama annulla l'unione nel worktree di merge e il giro **resta in Waiting**: la cartella aperta non riceve marcatori, ma il developer non è avvisato e ogni controllo ripete il tentativo.

## What should happen

L'opzione scelta per il Drift d'origine manda il giro in **Conflict** con il Merge Drift, come per un conflitto fra Proposal. Il Modello però non ha nessuna Transizione da Waiting a Conflict: Waiting esce solo con `workspace.TREE_READY` (verso No round) e `developer.ABANDON_ROUND`. Non posso far nascere il Merge Drift da Waiting senza una Transizione che il Modello non ha.

## Chosen option

**Aggiungere Waiting → Conflict al Modello**

Una Transizione nuova in Waiting, per esempio sull'evento della cartella pronta con unione in conflitto, che lascia i marcatori nel worktree di merge e scrive il Merge Drift. Il developer decide come per un conflitto fra Proposal (riconciliare o abbandonare). Costa una Proposal sul Modello e poco codice: il ramo che oggi annulla l'unione la lascia aperta.

## Where in the code

src/core/worktree-merge.ts: landReadyMerge
