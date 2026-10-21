---
status: approved
base:
  work/task.md: 2b2542f0f7955eafcb87d40f033121575916b1036fe562d55fdab6eddc9ec5de
  actors/agent.md: a5cab030093262fc2f5293fe70f321ccea32305651b4aaae688c07c88765aacf
  requirements/data/work.md: 12b2bb7a69029392664aa2160b2cceb6a3db6f2a8b2eca1860e5defab1d2103a
  requirements/cli/main.md: 0b8c8b0afd9f812033d48acb2086d641f4399c9abfcf0b627a6c874aa6d1df53
  requirements/rules/task-progress.md: new
  requirements/tech/task-progress.md: new
  requirements/ui/task-progress.md: new
delete: []
request: 2026-10-21T09-05-52
created: 2026-10-21T07:21:19.772Z
label: Task progress
---
# Task progress

The developer wants to see how far the agent is in each Task it is working on: a coarse percentage, self-declared by the agent, shown only on Tasks in Active for now.

Decisions from the interview:
- Values: 0–100% in steps of 10; 100% is allowed while the Task is still In progress.
- Only the agent that has taken the Task declares it: the same terminal or chat that took it; a Task taken without a known terminal accepts any agent.
- A declaration on a Task the agent has not taken (To do, Free, Done, taken by another terminal or chat, or by a developer) changes nothing and is ignored with a note, never an error.
- A declaration never moves or takes a Task: `trama task move <id> doing` with `{progress}` only declares.
- Any value replaces the last one, also a lower one.
- The percentage is cleared every time the Task leaves Taken by the agent (released, taken back, moved to To do or Done, closed unchanged); a re-taken Task starts with none. In Cursor's chat it restarts each turn.
- A just-taken Task shows no bar until the first declaration.
- The agent declares by its own judgement at natural milestones; the `trama-implement` skill gives rough guidance, no fixed values. In a parallel run each sub-agent declares for its own Task.
- Kept in a local non-versioned folder `.trama/progress/`, one file per Task.
- Card in Active: thin bar across the bottom (shadcn `Progress`, in the cyan of the working border) plus the `40%` text in the header.
- Command line: `(agent working, 40%)` in `project show`, `task list` and `task show`; `--json` gets `progress`.
- `trama timing list` records nothing new.
