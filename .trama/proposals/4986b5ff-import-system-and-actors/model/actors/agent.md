# Agent

A coding agent working for the developer. It explores the Model, writes Proposals, files Tasks and Drifts and implements Tasks, through Trama's tools or command line. It can never approve or reject a Proposal or resolve a Drift: those stay with the developer.

## Events

### MOVE_TASK_TO_TODO
The agent puts a Task back in the To do column.

### MOVE_TASK_TO_DOING
The agent starts working on a Task and moves it to In progress.

### MOVE_TASK_TO_DONE
The agent finishes a Task and moves it to Done.
