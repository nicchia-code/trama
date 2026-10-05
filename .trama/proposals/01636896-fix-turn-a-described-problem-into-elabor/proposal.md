---
status: approved
base:
  actors/developer.md: 00b0f0cb2f68e067ea349cd8b47d6e65b511aa222f422e8aae612e25a93734d3
  agent-launching/agent-terminal.md: ab9d45a11fd2c31d81bb2def6a3c3943f00f24392bb9d9fd150a03c0fc97c2d2
  editor-panel/panel.md: 5df1434c3024a69f05f3f820ede152053fe18eab602e86a3377acff44879cd3f
  work/task.md: 40ded19852fbed1db5a5399edfebf8ee0bca5a5b1d592278f0081c47f47eaad1
  requirements/rules.md: 19ac80e20f5303145faff6b5e1e0cd60f69a63e225687b1f8ee2fca493e93311
  requirements/tech.md: 3ac6e0ca63f10fdde22e84fa9fb285f994a1cd7f75088c8829061ffe6fbce4cd
delete: []
created: 1970-01-01T00:00:00.009Z
---
# Fix: turn a described problem into elaborated Tasks

The Board's New technical task button creates a Task with only a title, so a problem noticed by hand is never elaborated the way a Scan's Tasks are (references to the Model and Requirements, a body in domain words). A Fix button next to Design lets the developer describe a problem in a line; the agent, with a new trama-fix skill, finds where code and Model or Requirements disagree and files the elaborated Task(s). It replaces New technical task. Decisions confirmed with the developer: Fix sits wherever Design is (Diagram, Board, Requirements tabs, and a command); the request is typed in a box when the button does not carry one, and an empty request sends nothing; the agent asks as many rounds of questions as it needs about what the code and the Model cannot tell; the outcome is Tasks (one per coherent unit) that reference the Model or Requirements element the symptom belongs to, a Technical Task with no references but with symptom, expected behaviour and how to reproduce when it belongs to none, or a Drift (with a Proposal only when the code handles an important case the Model forgot) when the Model is silent or wrong; it never changes code, Model or Requirements; its Tasks belong to no design; New technical task disappears from the Board while the task new --technical command stays for the agent. Choices to check: the instruction wording, and the name trama-fix.
