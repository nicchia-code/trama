# Multi-branch

L'interruttore di questa copia di lavoro. Acceso, accettare una Proposal ordinaria la manda in un worktree (vedi la Proposal e il Worktree round). Il comando dell'agente dei worktree resta da configurare: senza, l'interruttore non si accende.

## States

### Off (initial)
Le accettazioni ordinarie copiano i file nella cartella aperta. È così anche quando il ricordo dell'interruttore manca. Quando il ricordo c'è ma non si legge, l'interruttore è spento e il developer è avvisato.
- `developer.TURN_MULTI_BRANCH_ON` → On: solo se il comando dell'agente dei worktree è impostato. Se un giro è ancora aperto, le accettazioni successive vi rientrano, dallo stesso commit di partenza.
- `developer.TURN_MULTI_BRANCH_ON` → Off: il comando non è impostato. L'interruttore resta spento e il developer è avvisato di impostarlo.

### On
Accettare una Proposal ordinaria apre un worktree.
- `developer.TURN_MULTI_BRANCH_OFF` → Off: un giro già aperto continua fino in fondo. Le accettazioni successive tornano nella cartella aperta e non entrano nel giro.
