# Announcement

A card the agent is about to create, announced so that the Board can show a ghost of it meanwhile: a Proposal or a Drift waiting in To decide, or a Task waiting in To do. An announcement is not a card: it cannot be decided on or moved, it does not count among what awaits a decision and it has no effect on the Model.

An announcement is created Preparing, as soon as the agent knows it will create the card, by the agent announcing it with the kind and the title of the card. Trama itself creates one when the developer asks the agent for a design (also to rework the stale Proposal of a Drift) from the terminal launcher; the title is then the developer's request. A Proposal the agent starts that no announcement is waiting for, as happens with the chat launcher, creates its own announcement already Writing. An announcement lasts only as long as the agent's work: once the real card has arrived, or the work is over without it, it is gone.

An announcement belongs to the agent terminal in which its agent runs, when there is one: the terminal Trama typed a design request into, or the terminal of the agent that announced it. What happens in another agent terminal, or to a command other than the one Trama typed, never touches it. An announcement made from the editor's chat, or by an agent Trama did not start, belongs to no terminal and is withdrawn only by the clock or by the editor starting up.

## States

### Announced (initial)
The card has not arrived yet. The Board shows its ghost. Whatever the agent or the clock does with it applies in both sub-States.
- `agent.SUBMIT_PROPOSAL` → Delivered: the agent hands over the Proposal the announcement is bound to, so its card arrives in To decide.
- `agent.FILE_TASK` → Delivered: the agent files the Task it announced.
- `agent.FILE_DRIFT` → Delivered: the agent files the Drift it announced.
- `developer.DISCARD_PROPOSAL` → Withdrawn: only if the Proposal bound to the announcement is the one discarded; the developer gave up the draft on purpose, so no notice is shown.
- `terminal.COMMAND_ENDED` → Withdrawn: only the end of the command Trama typed into the agent terminal the announcement belongs to counts, so no agent can still be working there; every announcement of that terminal still waiting is withdrawn at once and the developer is told the agent finished without delivering what it announced. When Trama cannot tell that the command that ended is the one it typed, nothing is withdrawn for this reason.
- `terminal.CLOSED` → Withdrawn: the agent terminal the announcement belongs to was closed; withdrawn as when the command ends, with the same notice. Closing another terminal changes nothing.
- `time.QUIET_PERIOD_ELAPSED` → Withdrawn: nothing happened for fifteen minutes, so the agent is taken to have stopped; the developer is told, as when the command ends.

#### Preparing (initial)
The agent is working on it and nothing is written yet; it may be waiting for the developer's answers.
- `agent.START_PROPOSAL` → Writing: only for an announced Proposal; the new Draft is bound to the announcement and the ghost takes its title. The Draft is taken by the oldest announcement of the developer's request still Preparing, or by the one the agent names.

#### Writing
The Draft of the Proposal exists and the agent is writing it.

### Delivered (final)
The real card has arrived and the ghost is gone.

### Withdrawn (final)
The card never came and the ghost is gone.
