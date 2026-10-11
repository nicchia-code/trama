---
column: done
technical: true
refs:
  - requirements/rules#agent-terminal
  - requirements/tech#drift-resolution
drift: v6zmsph9
proposal: null
agent: false
created: 2026-10-11T05:07:16.567Z
finished: 2026-10-11T05:19:45.134Z
---
# Fix code to match the Requirements: Instructions of tracked jobs sent to the terminal are no longer one line

## What happens

Scans, Runs and Resolve Drifts get a second paragraph with the job ID and the `--job` hint, placed before the sub-agent limit, the comparison sentence and the language sentence. This also happens in a terminal, where the job ID is already in the terminal environment, and in the Copilot chat. Those sentences no longer follow the instruction on its line.

## What should happen

The instruction is one line with a terminal and with Copilot's chat, and the limit, comparison and language sentences follow it on that line. The terminal can find the job identity by itself; only the chat has to be given it explicitly.

## Chosen option

**Give the job ID only in the chat**

In a terminal, pass the identity through the environment only and keep one line. The chat keeps an explicit identity, placed so that the other sentences stay on the instruction's line.

## Where in the code

extension/src/host/agent.ts, terminal and chat prompt building
