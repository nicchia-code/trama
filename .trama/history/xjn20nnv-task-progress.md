---
created: 2026-10-21T07:31:51.253Z
updated: 2026-10-21T07:31:51.253Z
summary: An agent that has taken a Task can declare a coarse percentage of progress; the Board and the command line show it, and it is forgotten when the Task leaves Taken by the agent.
tasks:
  - 3gsod9hp
cleared:
  3gsod9hp:
    title: Task progress
    proposal: 1gzoeb06
    tag: Task progress
    finished: 2026-10-21T07:30:25.782Z
    refs:
      - task
      - agent.DECLARE_TASK_PROGRESS
      - requirements/data#task/Taken by the agent
      - requirements/rules#task/Taken by the agent
      - requirements/tech#task/Taken by the agent
      - requirements/ui#task/Taken by the agent
      - requirements/cli#General
---
# Task progress

While an agent has taken a Task it can declare how far along it is. Only the agent that took the Task (same terminal or chat), or any agent when the Task was taken without a known terminal or chat, can declare; the new percentage replaces the previous one, even a lower one. A declaration from another agent, or for a Task the agent has not taken, changes nothing and the agent is told so without an error. Declaring never moves or takes a Task. The percentage is kept while the Task stays taken (an agent moving it to doing again keeps it) and is forgotten when the Task goes back to todo, to done, is taken back by the developer, or is closed without changes.
