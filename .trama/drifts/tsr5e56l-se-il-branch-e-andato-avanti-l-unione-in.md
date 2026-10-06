---
status: resolved
resolution: fix-code
refs:
  - worktree-round/Waiting/workspace.TREE_READY
  - requirements/quality#worktree-round
proposal: null
task: euphay7g
origin: null
option: 1
note: null
created: 2026-10-06T12:42:35.348Z
---
# Se il branch è andato avanti, l'unione in attesa mette marcatori nella cartella aperta e il giro resta fermo

## What happens

Mentre il giro è in **Waiting**, il developer può fare commit sul branch di partenza. Quando la cartella torna pulita su quel branch, Trama applica l'unione con un vero merge nella cartella aperta:

- se il commit nuovo tocca le stesse righe, git scrive i **marcatori di conflitto nella cartella aperta**, poi Trama annulla il merge;
- il giro resta in Waiting **per sempre**, senza nessun avviso (l'avviso dell'attesa esce solo la prima volta), e ogni controllo della cartella ripete il tentativo.

## What should happen

La cartella aperta **non riceve mai** i marcatori: l'unione si prova solo nel worktree di merge e si applica alla cartella solo quando è pulita e senza conflitti. Con la cartella pronta (TREE_READY) il giro va in No round: la cartella è aggiornata, i worktree eliminati, il developer sa che il giro è unito.

## Fix options

### Riprovare l'unione nel worktree di merge

Prima di applicare, Trama porta nel worktree di merge il commit attuale del branch e unisce lì. Se non ci sono conflitti, la cartella riceve un risultato che si applica senza merge vero. Se ci sono, il giro va in Conflict con il Merge Drift, come per un conflitto fra Proposal. Serve una Transizione nuova nel Modello da Waiting a Conflict.

### Aspettare il commit di partenza

Trama applica l'unione solo se il branch è ancora al commit di partenza; altrimenti resta in Waiting e avvisa che il branch è andato avanti e che si può solo abbandonare il giro. Niente marcatori nella cartella, ma il lavoro fatto sul branch nel frattempo obbliga a buttare il giro. Il Modello va precisato.

### Applicare solo senza conflitti, e avvisare

Trama controlla prima, senza toccare la cartella, se il merge avrebbe conflitti. Se sì, resta in Waiting e avvisa una volta che il branch è cambiato in modo incompatibile. La cartella resta pulita, ma il giro non ha una strada per sistemare il conflitto oltre all'abbandono.

## Where in the code

src/core/worktree-merge.ts: landReadyMerge (git merge nella cartella aperta, poi merge --abort); extension/src/host/main.ts: watchReadyRound (ripete il tentativo a ogni cambio in .git e ogni 5 secondi)
