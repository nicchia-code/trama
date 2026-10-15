---
status: resolved
resolution: proposal
refs:
  - requirements/tech#agent-terminal
proposal: null
task: null
origin: 0udf8k7s
previous: jpwtmth1
critical: false
option: null
note: null
resolvedBy: u4kohteu
created: 2026-10-14T09:47:13.411Z
---
# Idle agent terminal: Requirement and code disagree on remembering it

## What happens

With automatic closing off, an agent terminal left idle is still remembered by Trama until it is closed, and closing it releases the Tasks the agent took and withdraws the announcements waiting on it. This is the behaviour the Task 0udf8k7s asks for.

## What should happen

The Requirement says that with automatic closing off the terminal is removed from Trama's list **and nothing more**, and that closing a terminal only counts for terminals on that list, so closing an idle terminal releases nothing. The Model says that closing an agent terminal releases the Tasks it took. The Requirement and the Model therefore disagree with the code and with the Task, and the Requirement must be decided.

## Fix options

### Keep idle terminals until closed and rewrite the Requirement

Idle terminals stay remembered until closed, and closing them releases the taken Tasks and withdraws waiting announcements, as the Model says. The code stays as it is. The Requirement text is rewritten to say so. Costs: one Requirement edit, made with the technical requirements skill; no code or Model change.

### Forget idle terminals as the Requirement says

With automatic closing off, an idle terminal is dropped from the list and no longer remembered. Closing it then releases nothing, which contradicts the Model's rule that closing an agent terminal releases its Tasks. Costs: a code change, Task 0udf8k7s is reversed, and the Model rule would need a decision too, since the Model cannot be followed for idle terminals.

## Where in the code

extension/src/host/agent.ts (idle terminal tracking and the autoExit branch)
