---
status: resolved
resolution: fix-code
refs:
  - task/Taken by the agent/terminal.COMMAND_ENDED
  - requirements/rules#task
proposal: null
task: b0d99157
origin: null
option: null
note: null
created: 1970-01-01T00:00:00.004Z
---
# Earlier concurrent agent terminal completion leaves Tasks taken

The Task Model requires terminal.COMMAND_ENDED to release taken Tasks to Free without moving their column, and requirements/rules#task requires every marked Task to be released when the agent command ends. extension/src/host/agent.ts:44-47 tracks only lastTerminal and lastRoot. Its completion handler ignores any other terminal at :64-69, while launchAgent creates a second terminal when the previous one is busy and replaces the tracked terminal at :100-108. A disposable host probe ran the actual launch/watch handlers with simulated VS Code shell-execution events and real temporary Task records: after launching A and then B and taking two Tasks, ending A left both marked agent=true; only ending B released the marks, keeping both columns doing. Thus an observable completion from an earlier Trama agent terminal is ignored and leaves Tasks taken. Done Task 0010 describes the intended release behavior, but no open card covers this confirmed concurrent-terminal failure. The probe did not exercise a real editor UI; its evidence is the actual host handler and persisted Task state under simulated events. No resolution is selected.
