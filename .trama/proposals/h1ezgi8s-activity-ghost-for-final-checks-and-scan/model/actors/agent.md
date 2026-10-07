# Agent

A coding agent working for the developer. It explores the Model, writes Proposals, files Tasks and Drifts and implements Tasks, through Trama's command line. It can never approve or reject a Proposal or resolve a Drift: those stay with the developer. The one rejection that follows from something the agent does is that of a stale Proposal it replaces on a Drift.

## Events

### MOVE_TASK_TO_TODO
The agent puts a Task back in the To do column.

### MOVE_TASK_TO_DOING
The agent starts working on a Task and moves it to In progress.

### MOVE_TASK_TO_DONE
The agent finishes a Task and moves it to Done.

### START_PROPOSAL
The agent starts writing a new Proposal, which begins as a Draft.

### SUBMIT_PROPOSAL
The agent says it has finished writing a Proposal and hands it over to the developer.

### EDIT_PROPOSAL
The agent registers a file with a Proposal, rewrites it or marks a file for deletion.

### FILE_TASK
The agent files a new Task.

### FILE_DRIFT
The agent files a new Drift.

### CHANGE_CHECK_PHASE
L'agente dice che un controllo che ha annunciato passa a una nuova fase, per esempio dalla verifica allo scan.

### FINISH_CHECK
L'agente dice che un controllo che ha annunciato è finito, con la verifica e lo scan conclusi o non necessari.

### REPLACE_DRIFT_PROPOSAL
The agent attaches a newer Proposal to a Drift in place of the stale one attached to it, after the developer asked it to rework that Proposal.

### ASK_QUESTIONS
The agent asks the developer a round of related questions and waits for the answers.

### STOP_WAITING
The agent's wait for a question round ends without an answer because the caller stops waiting: the agent is stopped, its terminal closes, its question call is cancelled or times out, or the caller disconnects. Loss of the editor while the caller is still waiting is reported by `editor.DISCONNECTED` instead.
