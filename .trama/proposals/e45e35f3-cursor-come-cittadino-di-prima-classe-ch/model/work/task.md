# Task

A unit of work for the agent, kept on the Board. It points to the Model elements and Requirements it concerns; a Technical Task changes no behaviour and points only to Requirements, if anything.

A Task is created in To do, by the agent after a Scan, or when the developer decides a Drift is fixed in the code. A Task that the agent files after the approval of a Proposal belongs to that Proposal, its design, and the Board shows the Tasks of one design together. A Task filed by a Scan the developer started by hand, a Technical Task, a Task that fixes a Drift and every Task that existed before this link, including those filed by the Fix action that no longer exists, are not part of any design. There is no way to delete a Task.

The Board offers the developer no way to move a Task: there are no move buttons, no dragging and no Take back button; the only things the developer does with a Task there are to look at it and to ask the agent to run it. Moving a Task, and taking it back from the agent, remain possible from the command line. While the agent works on a Task, the developer cannot move it even from there. The agent takes a Task when it moves it to In progress through the command line in the terminal Trama started for it; a move made by the developer never takes a Task. A move the agent makes from outside that terminal cannot be told from the developer's and does not take it. The developer gets a taken Task back with the command line, and when the agent's command ends every taken Task is released on its own and goes back to To do, so that the agent can pick it up again. Tasks that were already In progress when this rule appeared are not taken.

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
- `terminal.COMMAND_ENDED` → To do: the agent's command ended, so no agent can still be working; every Task taken by the agent is released at once and goes back to To do.
- `cursor-chat.AGENT_STOPPED` → To do: solo per i Task presi dall'agente della chat di Cursor dello stesso progetto; il turno dell'agente è finito, quindi nessun agente sta lavorando adesso; ogni Task preso è rilasciato subito e torna in To do. Se l'agente riprende, lo prende di nuovo.
- `cursor-chat.AGENT_INTERRUPTED` → To do: come sopra, perché il turno è stato interrotto o è andato in errore.
- `cursor-chat.CONVERSATION_CLOSED` → To do: come sopra, perché la conversazione è stata chiusa.

### Done
The work is finished. Nothing prevents moving the Task back from the command line.
- `developer.MOVE_TASK_TO_TODO` → To do: only from the command line.
- `developer.MOVE_TASK_TO_DOING` → In progress: only from the command line.
- `agent.MOVE_TASK_TO_TODO` → To do
- `agent.MOVE_TASK_TO_DOING` → Taken by the agent: only if the Task is not blocked, as in To do.
