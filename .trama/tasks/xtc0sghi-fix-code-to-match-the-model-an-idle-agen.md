---
column: done
technical: false
refs:
  - agent-terminal/Agent idle
  - requirements/tech#agent-terminal
  - requirements/rules#agent-terminal
drift: icprjc4t
proposal: null
agent: false
created: 2026-10-11T06:59:04.443Z
finished: 2026-10-11T07:03:51.355Z
---
# Fix code to match the Model: An idle agent terminal is still followed by Trama

## What happens

After the agent goes idle with `trama.autoExit` off, the terminal stays in Trama's list of followed terminals. If the developer types a prompt by hand and the agent resumes, its next idle signal or the end of the command again releases the Tasks that agent took, withdraws its waiting announcements and ends its work. Closing the idle terminal does the same once more.

## What should happen

An idle terminal is no longer followed: Trama drops it from its list when the agent goes idle (and when it disposes the terminal), so a later idle hook, command end or close changes nothing. What the resumed agent files reaches the Board like any other card, and its taken Tasks and announcements are not touched by Trama.

## Chosen option

**Stop following an idle terminal**

Remove the terminal from the list as soon as the agent goes idle or its command ends, whether or not it is disposed. Later signals and the close then do nothing. Matches the Model and Requirements; a resumed agent's Tasks stay taken until the developer takes them back.

## Where in the code

extension/src/host/agent.ts: `finishAgentTerminal`, `endAgentWork`, the terminal-close handler in `watchAgentTerminal` (the terminal is only removed from the list on close)
