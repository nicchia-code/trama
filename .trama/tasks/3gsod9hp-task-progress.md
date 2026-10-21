---
column: done
technical: false
refs:
  - task
  - agent.DECLARE_TASK_PROGRESS
  - requirements/data#task/Taken by the agent
  - requirements/rules#task/Taken by the agent
  - requirements/tech#task/Taken by the agent
  - requirements/ui#task/Taken by the agent
  - requirements/cli#General
drift: null
proposal: 1gzoeb06
agent: false
created: 2026-10-21T07:26:34.189Z
finished: 2026-10-21T07:30:25.782Z
---
# Task progress

While the agent has taken a Task, it can declare a coarse percentage of how far along it is, and the Board and the command line show it.

When done:
- `agent.DECLARE_TASK_PROGRESS` in Taken by the agent → Taken by the agent: only from the agent that took the Task, in the same terminal or chat, or from any agent when the Task was taken without a known terminal or chat; the Task remembers the declared percentage in place of the previous one, even a lower one. A declaration from another agent changes nothing and the agent is told so.
- Declaring never moves or takes a Task: a declaration for a Task that this agent has not taken, whatever its column, changes nothing, and the agent is told so without an error.
- The percentage is forgotten whenever the Task leaves Taken by the agent (released, taken back, moved to To do or Done, closed without changes, origin sent back by a Drift fixed in the code); a Task taken again shows none until the agent declares a new one.
- `trama task move <id> doing` accepts `{ progress }` (0–100, multiples of 10) as the declaration, as the Requirements describe; `docs/cli.md` is regenerated.
- The value lives in `.trama/progress/<task id>`, local and ignored by git, and reaches the Snapshot and the `--json` outputs as `progress`.
- The Active card of a taken Task with a percentage shows the shadcn `Progress` bar in the working cyan and the `40%` text; the command line marks it "(agent working, 40%)".
- The `trama-implement` skill tells the agent and each sub-agent to declare the percentage of its own Task at natural milestones of its own judgement.
