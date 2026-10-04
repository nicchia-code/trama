# Developer

The person who owns the project. Decides what enters the Model, resolves differences between code and Model, steers the agent and looks at the Diagram, the Board and the Requirements in the editor panel.

## Events

### APPROVE_PROPOSAL
The developer approves an open Proposal, from the Board or from the Diagram's detail panel.

### REJECT_PROPOSAL
The developer rejects an open Proposal and gives feedback for the agent. Cancelling the feedback prompt rejects nothing.

### DISCARD_PROPOSAL
The developer discards a Proposal the agent is still writing, with the command line. It is for drafts the agent never finished; a Proposal already handed over is rejected instead.

### FIX_DRIFT_CODE
The developer decides an open Drift is right about the Model and the code must change.

### ACCEPT_DRIFT_PROPOSAL
The developer decides the code is right and accepts the Proposal attached to an open Drift.

### DISMISS_DRIFT
The developer closes an open Drift without any change.

### MOVE_TASK_TO_TODO
The developer moves a Task to the To do column, by dragging it or with the card's buttons.

### MOVE_TASK_TO_DOING
The developer moves a Task to the In progress column.

### MOVE_TASK_TO_DONE
The developer moves a Task to the Done column.

### TAKE_BACK_TASK
The developer takes back a Task that the agent has taken, with the Take back button on its card or the command of the same name. The Task stays In progress and is the developer's again.

### ASK_AGENT
The developer asks the coding agent to work, from a button or a command: design a change (with a request typed in), fix a problem (described in a line, which the agent turns into Tasks), scan the whole System or one Feature, implement one Task, implement every Task in To do, implement the Tasks in To do that come from one design, or import the existing code as Proposals.

### INITIALIZE_PROJECT
The developer asks to set up Trama in a workspace folder.

### UPDATE_SKILLS
The developer asks to refresh the agent skills of the project with the ones shipped with this version of Trama.

### OPEN_PANEL
The developer opens the Trama panel, or brings it to the front.

### CLOSE_PANEL
The developer closes the Trama panel.

### SHOW_DIAGRAM
The developer switches to the Diagram tab, or follows a link from another tab to an element or to a Proposal drawn over the Model.

### SHOW_BOARD
The developer switches to the Board tab.

### SHOW_REQUIREMENTS
The developer switches to the Requirements tab, or follows a link to a Requirement.

### OPEN_SYSTEM_LEVEL
The developer zooms the Diagram out to the whole System, with the breadcrumb or by following a link to a Feature or an Actor.

### OPEN_FEATURE_LEVEL
The developer shows one Feature in the Diagram, by opening it, with the breadcrumb or by following a link to one of its Machines.

### OPEN_MACHINE_LEVEL
The developer shows one Machine in the Diagram, by opening it, with the breadcrumb or by following a link to one of its States or Transitions.

### OPEN_STATE_LEVEL
The developer zooms into a State that has sub-States, in the Diagram.

### CHOOSE_ANSWER
The developer accepts one choice or a set of choices for the current question.

### CHOOSE_OTHER
The developer chooses to write a free answer, alone or alongside choices in a multiple-choice question.

### WRITE_ANSWER
The developer accepts the free answer written for the current question.

### GO_BACK
The developer returns to the preceding question, or from writing an answer or confirming a skip to the same question.

### PRESS_ESCAPE
The developer closes the current question to choose whether to skip, or returns from writing an answer or confirming a skip without accepting or skipping anything.

### SKIP_QUESTION
The developer confirms skipping only the current question.

### SKIP_ALL_QUESTIONS
The developer confirms skipping the current question and every question still remaining in the round.
