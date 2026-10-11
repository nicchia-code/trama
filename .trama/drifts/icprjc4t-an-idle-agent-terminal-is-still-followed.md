---
status: resolved
resolution: fix-code
refs:
  - agent-terminal/Agent idle
  - requirements/tech#agent-terminal
  - requirements/rules#agent-terminal
proposal: null
task: xtc0sghi
origin: null
critical: false
option: 1
note: null
resolvedBy: jln094rs
created: 2026-10-11T06:54:52.484Z
---
# An idle agent terminal is still followed by Trama

## What happens

After the agent goes idle with `trama.autoExit` off, the terminal stays in Trama's list of followed terminals. If the developer types a prompt by hand and the agent resumes, its next idle signal or the end of the command again releases the Tasks that agent took, withdraws its waiting announcements and ends its work. Closing the idle terminal does the same once more.

## What should happen

An idle terminal is no longer followed: Trama drops it from its list when the agent goes idle (and when it disposes the terminal), so a later idle hook, command end or close changes nothing. What the resumed agent files reaches the Board like any other card, and its taken Tasks and announcements are not touched by Trama.

## Fix options

### Stop following an idle terminal

Remove the terminal from the list as soon as the agent goes idle or its command ends, whether or not it is disposed. Later signals and the close then do nothing. Matches the Model and Requirements; a resumed agent's Tasks stay taken until the developer takes them back.

### Keep following it and update the Model

Keep the current behaviour: an idle terminal still withdraws announcements and releases Tasks when the agent idles again or the terminal closes. The Agent idle State and the Requirements would have to say this, with a self-transition on the idle hook. Resumed work is cleaned up, but the terminal is not truly left alone.

## Where in the code

extension/src/host/agent.ts: `finishAgentTerminal`, `endAgentWork`, the terminal-close handler in `watchAgentTerminal` (the terminal is only removed from the list on close)
