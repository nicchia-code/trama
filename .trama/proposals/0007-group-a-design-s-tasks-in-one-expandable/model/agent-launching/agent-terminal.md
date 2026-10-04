# Agent terminal

The terminal in which Trama runs the developer's agent command. Trama remembers only the last terminal it started. Typing a new command into a terminal where an agent is still running would send the command line to the agent as a message, so a busy terminal is never reused.

Only the terminal launcher moves this Machine. With the chat launcher the instruction goes to the editor's chat in a new agent conversation instead (in Cursor, or when the chat cannot be opened, it is copied to the clipboard and the developer is told to paste it), and nothing here changes.

## States

### No agent terminal (initial)
Trama has no terminal of its own to reuse: none was started yet, or the last one was closed.
- `developer.ASK_AGENT` → Agent running: only with the terminal launcher and only if an instruction is actually sent. Asks once for the agent command if none is configured and remembers the answer for all projects; cancelling that prompt, or a design request left empty, sends nothing. Opens a new terminal named "Trama agent" in the project folder, marked so that the command line refuses the developer-only decisions to the agent, and types the command with the instruction into it.
- `proposal.APPROVED` → Agent running: only for an ordinary change (never an import), only if automatic scanning is on, an agent can be started without asking the developer anything (the chat launcher, or an agent command is configured) and the approval affects at least one Feature that still exists. One agent run scans all those Features and is told which Proposal the Tasks it files come from. With the chat launcher the instruction goes to the chat and nothing changes here.

### Agent running
The agent command typed into the terminal has not ended, or the terminal cannot tell whether it did.
- `developer.ASK_AGENT` → Agent running: a new terminal is opened, because a running agent must not receive the instruction as a message; the old terminal is left alone and no longer tracked.
- `proposal.APPROVED` → Agent running: same as an automatic scan from the first State; a new terminal is opened.
- `terminal.COMMAND_ENDED` → Agent idle
- `terminal.CLOSED` → No agent terminal

### Agent idle
The terminal is open and its command has ended, so it is free for the next instruction.
- `developer.ASK_AGENT` → Agent running: the terminal is reused only if its process is still alive and it reports command start and end; otherwise a new one is opened.
- `proposal.APPROVED` → Agent running: same as an automatic scan from the first State, reusing the terminal under the same condition.
- `terminal.CLOSED` → No agent terminal
