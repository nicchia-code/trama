---
status: resolved
resolution: fix-code
refs:
  - requirements/rules#agent-terminal
  - requirements/tech#drift-resolution
proposal: null
task: ss2iiy84
origin: null
critical: false
option: 1
note: null
resolvedBy: ej18oyqh
created: 2026-10-11T05:04:06.955Z
---
# Instructions of tracked jobs sent to the terminal are no longer one line

## What happens

Scans, Runs and Resolve Drifts get a second paragraph with the job ID and the `--job` hint, placed before the sub-agent limit, the comparison sentence and the language sentence. This also happens in a terminal, where the job ID is already in the terminal environment, and in the Copilot chat. Those sentences no longer follow the instruction on its line.

## What should happen

The instruction is one line with a terminal and with Copilot's chat, and the limit, comparison and language sentences follow it on that line. The terminal can find the job identity by itself; only the chat has to be given it explicitly.

## Fix options

### Give the job ID only in the chat

In a terminal, pass the identity through the environment only and keep one line. The chat keeps an explicit identity, placed so that the other sentences stay on the instruction's line.

### Allow the job paragraph in the Requirements

Change the one-line rule to except tracked jobs and keep the code. No code change; the one-line promise weakens.

## Where in the code

extension/src/host/agent.ts, terminal and chat prompt building
