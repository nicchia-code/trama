# Worktree round

Un giro di Proposal accettate mentre l'interruttore multi-branch di questa copia di lavoro è acceso. I worktree nascono tutti dallo stesso commit del branch aperto in quel momento, così non si pestano i file. Il giro non è scritto nel repository: Trama lo riconosce dai worktree. Il branch aperto non cambia finché l'unione non è applicata alla cartella.

Spegnere l'interruttore non chiude il giro e non elimina i worktree. Un'accettazione a interruttore spento non entra nel giro. Riaccenderlo mentre il giro è ancora aperto fa entrare le accettazioni successive, dallo stesso commit di partenza.

## States

### No round (initial)
Nessun worktree di Proposal è aperto.
- `developer.APPROVE_PROPOSAL` → In progress: solo quando l'accettazione apre davvero un worktree (vedi la Proposal). Il giro ricorda il branch e il commit di partenza.

### In progress
Almeno una Proposal ha un worktree. Un'altra accettazione idonea entra nello stesso giro e nasce dallo stesso commit. Il merge non parte finché ogni Task di queste Proposal non è in Done.
- `developer.APPROVE_PROPOSAL` → In progress: un'altra Proposal idonea entra nello stesso giro.
- `developer.WITHDRAW_FROM_ROUND` → In progress: il developer toglie una Proposal e non è l'ultima. Il suo worktree si elimina e lei torna aperta.
- `developer.WITHDRAW_FROM_ROUND` → No round: era l'ultima Proposal del giro. Stesse conseguenze.
- `workspace.WORKTREE_LOST` → In progress: un worktree di Proposal non c'è più e ne resta almeno uno. Quella Proposal torna aperta e il developer è avvisato; il merge non la include.
- `workspace.WORKTREE_LOST` → No round: non resta nessun worktree di Proposal. Il developer è avvisato.
- `terminal.COMMAND_ENDED` → In progress: è finito il comando di un worktree del giro, ma qualche Task di una Proposal ancora nel giro non è in Done. Non si unisce nulla. Se il comando finito è la scansione e ha creato dei Task, Trama manda nello stesso terminale l'esecuzione di quella Proposal.
- `terminal.COMMAND_ENDED` → Merging: è finito un comando del giro e ogni Task delle Proposal ancora nel giro è in Done. Trama committa in ciascun worktree le modifiche rimaste e prova l'unione in un worktree di merge.
- `developer.FIX_DRIFT_CODE` → In progress: solo per un Drift di un worktree del giro, deciso dalla Board del progetto aperto. La decisione è scritta nel worktree e Trama rilancia lì l'esecuzione dei Task rimasti della Proposal di quel worktree, compreso il Task di correzione, che appartiene a quella Proposal.
- `developer.ACCEPT_DRIFT_PROPOSAL` → In progress: come sopra. L'accettazione della Proposal attaccata vale dentro quel worktree e non apre un altro giro.
- `developer.DISMISS_DRIFT` → In progress: come sopra.

### Merging
Trama sta unendo i worktree in una cartella a parte. Il branch aperto non è ancora cambiato.
- `MERGE_CLEAN` → Waiting: l'unione non ha conflitti, ma la cartella aperta non è il branch di partenza senza modifiche non committate. Trama avvisa e non tocca nulla. I worktree restano.
- `MERGE_CLEAN` → No round: l'unione non ha conflitti e la cartella aperta è quel branch, pulita. Trama aggiorna la cartella, elimina i worktree e fa sapere che il giro è unito. Poi parte il controllo delle Feature toccate, con l'agente di sempre nella cartella aperta.
- `MERGE_CONFLICT` → Conflict: l'unione ha conflitti. Nel branch non entra nulla. Nasce un Merge Drift per l'intero giro. I worktree restano.

### Conflict
Il Merge Drift del giro è aperto. Va risolto: o si riconcilia, o si abbandona il giro. Finché è aperto il branch non cambia.
- `developer.RECONCILE_MERGE` → Reconciling: il developer tiene il lato che sistema i conflitti, scegliendo una delle opzioni. Nasce un Task nel worktree di merge e Trama ci avvia l'agente col comando dei worktree.
- `developer.ABANDON_ROUND` → No round: il developer abbandona il giro. Ogni Proposal torna aperta, i worktree si eliminano, il Merge Drift non c'è più e il branch non cambia.

### Reconciling
L'agente sistema i conflitti nel worktree di merge.
- `terminal.COMMAND_ENDED` → Merging: solo se il Task di riconciliazione è in Done. Trama committa ciò che è rimasto, lasciando fuori il Merge Drift e quel Task, e riprova l'unione.
- `terminal.COMMAND_ENDED` → Reconciling: il Task non è in Done. Il giro resta fermo e il developer è avvisato; l'unione non si riprova. Si può abbandonare il giro.
- `developer.ABANDON_ROUND` → No round: come dal Conflict.

### Waiting
L'unione è pronta e aspetta che la cartella aperta sia di nuovo il branch di partenza, senza modifiche non committate.
- `workspace.TREE_READY` → No round: la cartella è pronta. Trama la aggiorna, elimina i worktree, fa sapere che il giro è unito e fa partire il controllo, come da Merging.
- `developer.ABANDON_ROUND` → No round: il developer rinuncia al risultato. I worktree si eliminano, le Proposal tornano aperte e il branch non cambia.

## Events

### MERGE_CLEAN
Emesso quando il tentativo di unione del giro non ha conflitti.

### MERGE_CONFLICT
Emesso quando il tentativo di unione del giro ha conflitti. Non entra nulla nel branch e nasce il Merge Drift.

### MERGED
Emesso quando l'unione è stata applicata alla cartella aperta. Le Proposal del giro diventano parte del modello. Il controllo delle Feature toccate parte dopo, una volta sola, e non è la scansione che segue di solito una singola accettazione.
