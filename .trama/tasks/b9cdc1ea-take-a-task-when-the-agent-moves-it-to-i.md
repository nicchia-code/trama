---
column: done
technical: false
refs:
  - task/To do
  - task/In progress
  - task/Taken by the agent
  - task/Free
  - task/Done
  - agent.MOVE_TASK_TO_DOING
  - agent.MOVE_TASK_TO_TODO
  - agent.MOVE_TASK_TO_DONE
  - developer.MOVE_TASK_TO_TODO
  - developer.MOVE_TASK_TO_DOING
  - developer.MOVE_TASK_TO_DONE
  - requirements/rules#task
  - requirements/tech#agent-terminal
drift: null
proposal: dc81bbfc
agent: false
created: 1970-01-01T00:00:00.008Z
---
# Take a Task when the agent moves it to In progress and refuse the developer's moves of a taken Task

The agent takes a Task when it moves it to In progress with its tools, or with the command line run in the terminal Trama started (the one marked TRAMA_AGENT); it keeps the mark if it moves the Task to In progress again, and moving it to To do or Done clears the mark. A move by the developer never takes a Task, and neither does a move made from outside that terminal. The developer cannot move a taken Task: not with the Board's arrows or drag, not with the move message the Board sends the editor, and not with the command line without TRAMA_AGENT; the refusal says the agent is working on it and points to Take back. Moves by the agent are always allowed, from any column. Depends on the mark.
