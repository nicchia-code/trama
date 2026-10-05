# Agent

A coding agent working for the developer. It explores the Model, writes Proposals, files Tasks and Drifts and implements Tasks, through Trama's tools or command line. It can never approve or reject a Proposal or resolve a Drift: those stay with the developer.

## Events

### MOVE_TASK_TO_TODO
The agent puts a Task back in the To do column.

### MOVE_TASK_TO_DOING
The agent starts working on a Task and moves it to In progress.

### MOVE_TASK_TO_DONE
The agent finishes a Task and moves it to Done.

### SUBMIT_PROPOSAL
The agent says it has finished writing a Proposal and hands it over to the developer.

### EDIT_PROPOSAL
The agent registers a file with a Proposal, rewrites it or marks a file for deletion.

### ASK_QUESTIONS
The agent asks the developer a round of related questions and waits for the answers.

### STOP_WAITING
The agent's wait for a question round ends without an answer: the agent is stopped, its terminal closes, or its question call is cancelled, times out or disconnects.
