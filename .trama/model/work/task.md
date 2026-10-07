# Task

A unit of work for the agent, kept on the Board. It points to the Model elements and Requirements it concerns; a Technical Task changes no behaviour and points only to Requirements, if anything.

Un Task nuovo nasce con un'identità propria, non presa da un contatore condiviso con gli altri, e ricorda l'istante in cui è stato creato. Quell'istante ne fissa il posto: il più vecchio prima. Due Task creati nello stesso istante si ordinano per identità. Un Task già numerato, che non ricorda l'istante, resta leggibile e sta prima di quelli che lo ricordano; fra i numerati l'ordine è il numero. Il prossimo Task eseguibile è il più vecchio fra quelli eseguibili.

Finché è vivo, un Task ha anche un numero breve temporaneo, `T3`, che il developer usa per leggere la Board e per citarlo, al posto dell'identità permanente. Il Task lo prende appena la copia di lavoro lo vede e lo tiene mentre è in To do o In progress. Un Task che non fa parte di alcun design lo libera quando va in Done. Un Task che fa parte di un design lo tiene anche in Done, finché tutti i Task del suo design non sono in Done: allora lo liberano tutti insieme. Se un design finito si riapre, perché gli si lega un Task nuovo o perché un suo Task torna indietro, i Task già Done restano senza numero; un numero nuovo lo prende solo il Task in To do o In progress. Un Task Done senza numero si mostra con la sua identità permanente.

A Task is created in To do, by the agent after a Scan, or when the developer decides a Drift is fixed in the code. A Task that the agent files after the approval of a Proposal belongs to that Proposal, its design, and the Board shows the Tasks of one design together. A Task filed by a Scan the developer started by hand, a Technical Task and every Task that existed before this link, including those filed by the Fix action that no longer exists, are not part of any design. Un Task che corregge un Drift appartiene al design del Task da cui è nato il Drift, anche quando è un Technical Task; se quel Task non fa parte di alcun design, o il Drift non è nato da un Task, nemmeno il Task di correzione ne fa parte. There is no way to delete a Task.

Una corsa su più Task (tutti i Task in To do, o quelli di un design) non li realizza per forza uno alla volta. Quando l'agente può affidare lavoro ai suoi sotto-agenti, chiede a Trama un gruppo di al massimo quattro Task eseguibili che non riguardano la stessa cosa fra loro, li realizza insieme e chiede il gruppo seguente solo quando hanno finito tutti. Un agente senza sotto-agenti li realizza uno alla volta, come prima. I Task che riguardano la stessa cosa non stanno mai nello stesso gruppo, e l'ordine resta quello dei Task eseguibili: il più vecchio prima.

Alla fine di ogni corsa che ha realizzato almeno un Task, che sia un design, un Task singolo o tutti i Task in To do, e che non lascia bloccato nessun Task di quella corsa, lo stesso agente scansiona tutto il Sistema. I Task che quella scansione archivia appartengono al design della corsa, o a quello del Task singolo, se c'è; altrimenti a nessun design. Restano in To do: la corsa li riporta e si ferma, senza realizzarli e senza un'altra scansione.

The Board offers the developer no way to move a Task: there are no move buttons, no dragging and no Take back button; the only things the developer does with a Task there are to look at it and to ask the agent to run it. Moving a Task, and taking it back from the agent, remain possible from the command line. While the agent works on a Task, the developer cannot move it even from there. The agent takes a Task when it moves it to In progress through the command line in the terminal Trama started for it; a move made by the developer never takes a Task. A move the agent makes from outside that terminal cannot be told from the developer's and does not take it. The developer gets a taken Task back with the command line, and when the agent's command ends every Task taken by that terminal is released on its own and goes back to To do, so that the agent can pick it up again. Tasks that were already In progress when this rule appeared are not taken.

Nella chat di Cursor un Task viene preso anche senza il terminale di Trama: Cursor segna da sé i comandi del suo agente, quindi lo spostamento in In progress fatto da quell'agente prende il Task e uno fatto dal developer no. In una chat l'agente non ha un comando che finisce: i Task che ha preso sono rilasciati a ogni fine di turno dell'agente di una conversazione di Trama dello stesso progetto (vedi l'Actor cursor-chat), anche se l'agente aspetta solo una risposta del developer. Quando l'agente riprende, rimette in In progress il Task che gli serve e lo prende di nuovo.

A Task can be blocked by an open Drift (see the Drift), or, when it is the origin of a Drift fixed in the code, by the Task created for that fix until it is Done. A blocked Task cannot be taken by the agent, whatever its column. A Done Task is never blocked. Being blocked changes nothing else: from the command line the developer can still move it, and a Task already In progress that becomes blocked stays where it is and only shows that it is blocked.

## States

### To do (initial)
The Task waits for the agent.
- `developer.MOVE_TASK_TO_DOING` → In progress: only from the command line.
- `developer.MOVE_TASK_TO_DONE` → Done: only from the command line.
- `agent.MOVE_TASK_TO_DOING` → Taken by the agent: the agent starts implementing it; only if the Task is not blocked, otherwise nothing changes and the refusal names the Drift, or the fix Task, that blocks it.
- `agent.MOVE_TASK_TO_DONE` → Done

### In progress
Someone is working on it. Whatever the agent does with it applies in both sub-States.
- `agent.MOVE_TASK_TO_TODO` → To do
- `agent.MOVE_TASK_TO_DOING` → Taken by the agent: the agent picks it up, or keeps it; only if the Task is not blocked, as in To do.
- `agent.MOVE_TASK_TO_DONE` → Done: the agent finished implementing it.

#### Free (initial)
The developer's: nobody has taken it.
- `developer.MOVE_TASK_TO_TODO` → To do: only from the command line.
- `developer.MOVE_TASK_TO_DONE` → Done: only from the command line.

#### Taken by the agent
The agent is working on it. The developer cannot move it, from the command line, until it is taken back.
- `developer.TAKE_BACK_TASK` → Free: only from the command line; the Task stays In progress and becomes the developer's.
- `terminal.COMMAND_ENDED` → To do: the agent's command ended in the terminal that had taken this Task, so that agent is no longer working on it; the Task is released at once and goes back to To do. The end of another terminal releases nothing here.
- `cursor-chat.AGENT_STOPPED` → To do: solo per i Task presi dall'agente della chat di Cursor dello stesso progetto; il turno dell'agente è finito, quindi nessun agente sta lavorando adesso; ogni Task preso è rilasciato subito e torna in To do. Se l'agente riprende, lo prende di nuovo.
- `cursor-chat.AGENT_INTERRUPTED` → To do: come sopra, perché il turno è stato interrotto o è andato in errore.
- `cursor-chat.CONVERSATION_CLOSED` → To do: come sopra, perché la conversazione è stata chiusa.

### Done
The work is finished. Nothing prevents moving the Task back from the command line. Il Task ricorda l'istante in cui è arrivato in Done; lo dimentica quando lascia Done e ne ricorda uno nuovo quando ci torna. I Task arrivati in Done prima che si ricordasse questo istante non ne hanno uno.
- `developer.MOVE_TASK_TO_TODO` → To do: only from the command line.
- `developer.MOVE_TASK_TO_DOING` → In progress: only from the command line.
- `agent.MOVE_TASK_TO_TODO` → To do
- `agent.MOVE_TASK_TO_DOING` → Taken by the agent: only if the Task is not blocked, as in To do.
