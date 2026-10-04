# Task

A unit of work for the agent, kept on the Board. It points to the Model elements and Requirements it concerns; a Technical Task changes no behaviour and points only to Requirements, if anything.

A Task is created in To do, by the agent after a Scan, by the developer as a new Technical Task, or when the developer decides a Drift is fixed in the code. A Task that the agent files after the approval of a Proposal belongs to that Proposal, its design, and the Board shows the Tasks of one design together. A Task filed by a Scan the developer started by hand, a Technical Task, a Task that fixes a Drift and every Task that existed before this link are not part of any design. There is no way to delete a Task.

While the agent works on a Task, the developer cannot move it. The agent takes a Task when it moves it to In progress, through its tools or through the command line in the terminal Trama started for it; a move made by the developer never takes a Task. A move the agent makes from outside that terminal cannot be told from the developer's and does not take it. The developer gets a taken Task back with a button, and when the agent's command ends every taken Task is released on its own. Tasks that were already In progress when this rule appeared are not taken.

## States

### To do (initial)
The Task waits for the agent.
- `developer.MOVE_TASK_TO_DOING` → In progress: dragged on the Board or moved with the card's buttons.
- `developer.MOVE_TASK_TO_DONE` → Done
- `agent.MOVE_TASK_TO_DOING` → Taken by the agent: the agent starts implementing it.
- `agent.MOVE_TASK_TO_DONE` → Done

### In progress
Someone is working on it. Whatever the agent does with it applies in both sub-States.
- `agent.MOVE_TASK_TO_TODO` → To do
- `agent.MOVE_TASK_TO_DOING` → Taken by the agent: the agent picks it up, or keeps it.
- `agent.MOVE_TASK_TO_DONE` → Done: the agent finished implementing it.

#### Free (initial)
The developer's: nobody has taken it.
- `developer.MOVE_TASK_TO_TODO` → To do
- `developer.MOVE_TASK_TO_DONE` → Done

#### Taken by the agent
The agent is working on it. The developer cannot move it, from the Board, from the editor or from the command line, until it is taken back.
- `developer.TAKE_BACK_TASK` → Free: the Task stays In progress and becomes the developer's.
- `terminal.COMMAND_ENDED` → Free: the agent's command ended, so no agent can still be working; every Task taken by the agent is released at once.

### Done
The work is finished. Nothing prevents moving the Task back.
- `developer.MOVE_TASK_TO_TODO` → To do
- `developer.MOVE_TASK_TO_DOING` → In progress
- `agent.MOVE_TASK_TO_TODO` → To do
- `agent.MOVE_TASK_TO_DOING` → Taken by the agent
