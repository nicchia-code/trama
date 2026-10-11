---
column: done
technical: false
refs:
  - agent-terminal
  - requirements/rules#agent-terminal
drift: 4b9ji8ya
proposal: null
agent: false
created: 2026-10-11T06:59:04.463Z
finished: 2026-10-11T07:08:02.988Z
---
# Fix code to match the Model: Instructions of tracked jobs in a terminal are still two paragraphs

## What happens

A scan, Run or Resolve Drifts started in a terminal sends an instruction in two paragraphs: the instruction line, then a second paragraph giving the job ID and telling the agent to pass `--job` to every command. The job ID is also placed in the terminal environment, but no Trama command reads it from there.

## What should happen

With a terminal the instruction stays one line. The terminal finds the job identity by itself from its environment, and only the chat is given it explicitly in the text.

## Chosen option

**One line, identity from the environment**

Drop the identity paragraph from the terminal instruction and make the commands that accept `--job` fall back to the terminal's job ID from its environment. The chat keeps its explicit identity. Costs a small change in the command line, so autopilot jobs keep working.

## Where in the code

extension/src/host/agent.ts: `terminalPrompt`, `jobIdentity`; the `--job` handling of the command line in `src/cli` does not read `TRAMA_JOB`
