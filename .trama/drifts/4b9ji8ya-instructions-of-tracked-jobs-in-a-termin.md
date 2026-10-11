---
status: resolved
resolution: fix-code
refs:
  - agent-terminal
  - requirements/rules#agent-terminal
proposal: null
task: hnc9bkqy
origin: null
critical: false
option: 1
note: null
resolvedBy: jln094rs
created: 2026-10-11T06:54:53.364Z
---
# Instructions of tracked jobs in a terminal are still two paragraphs

## What happens

A scan, Run or Resolve Drifts started in a terminal sends an instruction in two paragraphs: the instruction line, then a second paragraph giving the job ID and telling the agent to pass `--job` to every command. The job ID is also placed in the terminal environment, but no Trama command reads it from there.

## What should happen

With a terminal the instruction stays one line. The terminal finds the job identity by itself from its environment, and only the chat is given it explicitly in the text.

## Fix options

### One line, identity from the environment

Drop the identity paragraph from the terminal instruction and make the commands that accept `--job` fall back to the terminal's job ID from its environment. The chat keeps its explicit identity. Costs a small change in the command line, so autopilot jobs keep working.

### Keep the paragraph and relax the Requirement

Leave the code as it is and change the Requirement so a terminal instruction may have a second paragraph with the job ID. No code change, but the instruction is no longer one line and the unused environment variable stays.

## Where in the code

extension/src/host/agent.ts: `terminalPrompt`, `jobIdentity`; the `--job` handling of the command line in `src/cli` does not read `TRAMA_JOB`
