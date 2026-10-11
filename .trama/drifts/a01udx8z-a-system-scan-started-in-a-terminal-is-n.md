---
status: resolved
resolution: fix-code
refs:
  - agent-terminal
  - requirements/rules#announcement
proposal: null
task: 9i7wpa1p
origin: null
critical: false
option: 1
note: null
resolvedBy: ej18oyqh
created: 2026-10-11T05:04:02.237Z
---
# A System scan started in a terminal is never remembered for the Scan button

## What happens

When the developer presses Scan on the whole System with an omp or Claude Code agent, the launch in the terminal no longer tells the tracker of global scans that a System scan began. The chat path still does. So the delivered `Scan of the System` check of a terminal finds no launch to match, and nothing is written to the last-scan record.

## What should happen

The extension remembers every whole-System scan it launched from a Scan button, in the terminal where it typed it or in the chat. When the check titled `Scan of the System` for that terminal is delivered, it writes the start instant of that scan, so the Scan button counts the Tasks finished since then.

## Fix options

### Report the terminal launch again

Call the launch callback again right after the command is typed into the terminal, as the chat path does. Small change; terminal scans count again.

### Remember the scan from the job registry

Make the global-scan tracker read the tracked scan job instead of a callback. Removes the duplicate bookkeeping, but touches the tracker and its tests.

## Where in the code

extension/src/host/agent.ts, terminal branch of the launch; extension/src/host/global-scan.ts
