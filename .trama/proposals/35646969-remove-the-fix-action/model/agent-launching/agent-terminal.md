# Agent terminal

The terminal in which Trama runs the developer's agent command. Trama remembers only the last terminal it started. Typing a new command into a terminal where an agent is still running would send the command line to the agent as a message, so a busy terminal is never reused.

Only the terminal launcher moves this Machine. With the chat launcher the instruction goes to the editor's chat in a new agent conversation instead (in Cursor, or when the chat cannot be opened, it is copied to the clipboard and the developer is told to paste it), and nothing here changes.

Only the command Trama typed into a terminal counts as the agent's command: its start and end are what move this Machine. Another command that starts or ends in the same terminal, such as a shell start-up command or one the developer types, does not. Every terminal Trama starts has an identity of its own, so that what the agent announces from it is known to belong to it.

When the developer has chosen a language in the editor settings, every instruction Trama sends to the agent, with either launcher and whether it comes from a button, an automatic scan or the rework of a stale Proposal, also asks the agent to write in that language everything it generates, except code, which is always English. With no language chosen the instruction asks nothing about language. The choice only reaches agents that Trama starts; it changes nothing in text that already exists.

A design request, which includes asking the agent to rework the stale Proposal of a Drift, announces a Proposal (see the Announcement) as soon as it is sent, because the agent will create one. This holds only with the terminal launcher: with the chat launcher nothing here changes, and the Board shows a ghost from the moment the agent starts the Proposal's Draft.

## States

### No agent terminal (initial)
Trama has no terminal of its own to reuse: none was started yet, or the last one was closed.
- `developer.ASK_AGENT` → Agent running: only with the terminal launcher and only if an instruction is actually sent. Asks once for the agent command if none is configured and remembers the answer for all projects; cancelling that prompt, or a design request left empty, sends nothing. Opens a new terminal named "Trama agent" in the project folder, marked so that the command line refuses the developer-only decisions to the agent, and types the command with the instruction into it. A design request also announces a Proposal, so that the Board shows its ghost at once.
- `proposal.APPROVED` → Agent running: only for an ordinary change (never an import), only if automatic scanning is on, an agent can be started without asking the developer anything (the chat launcher, or an agent command is configured) and the approval affects at least one Feature that still exists. One agent run scans all those Features and is told which Proposal the Tasks it files come from. With the chat launcher the instruction goes to the chat and nothing changes here.

### Agent running
The agent command typed into the terminal has not ended, or the terminal cannot tell whether it did.
- `developer.ASK_AGENT` → Agent running: a new terminal is opened, because a running agent must not receive the instruction as a message; the old terminal is left alone and no longer tracked. A design request announces a Proposal, as from the first State.
- `proposal.APPROVED` → Agent running: same as an automatic scan from the first State; a new terminal is opened.
- `terminal.COMMAND_ENDED` → Agent idle
- `terminal.CLOSED` → No agent terminal

### Agent idle
The terminal is open and its command has ended, so it is free for the next instruction.
- `developer.ASK_AGENT` → Agent running: the terminal is reused only if its process is still alive and it reports command start and end; otherwise a new one is opened. A design request announces a Proposal, as from the first State.
- `proposal.APPROVED` → Agent running: same as an automatic scan from the first State, reusing the terminal under the same condition.
- `terminal.CLOSED` → No agent terminal
