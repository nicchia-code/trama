# Task

A unit of work for the agent, kept on the Board. It points to the Model elements and Requirements it concerns; a Technical Task changes no behaviour and points only to Requirements, if anything.

A Task is created in To do, by the agent after a Scan, by the developer as a new Technical Task, or when the developer decides a Drift is fixed in the code. A Task that the agent files after the approval of a Proposal belongs to that Proposal, its design, and the Board shows the Tasks of one design together. A Task filed by a Scan the developer started by hand, a Technical Task, a Task that fixes a Drift and every Task that existed before this link are not part of any design. There is no way to delete a Task.

## States

### To do (initial)
The Task waits for the agent.
- `developer.MOVE_TASK_TO_DOING` → In progress: dragged on the Board or moved with the card's buttons.
- `developer.MOVE_TASK_TO_DONE` → Done
- `agent.MOVE_TASK_TO_DOING` → In progress: the agent starts implementing it.
- `agent.MOVE_TASK_TO_DONE` → Done

### In progress
The agent, or the developer, is working on it.
- `developer.MOVE_TASK_TO_TODO` → To do
- `developer.MOVE_TASK_TO_DONE` → Done
- `agent.MOVE_TASK_TO_TODO` → To do
- `agent.MOVE_TASK_TO_DONE` → Done: the agent finished implementing it.

### Done
The work is finished. Nothing prevents moving the Task back.
- `developer.MOVE_TASK_TO_TODO` → To do
- `developer.MOVE_TASK_TO_DOING` → In progress
- `agent.MOVE_TASK_TO_TODO` → To do
- `agent.MOVE_TASK_TO_DOING` → In progress
