---
created: 2026-10-24T15:41:22.223Z
updated: 2026-10-24T15:41:22.223Z
summary: Announcement writes are atomic and locked, the execution check relies on certain facts, and only launched agents can hold Tasks.
tasks:
  - d2ncpr0z
  - e0iua7jy
  - zxzyu6e9
cleared:
  zxzyu6e9:
    title: Only launched agents hold Tasks
    proposal: kv1x3wmx
    tag: omp ACP IPC
    finished: 2026-10-24T15:24:05.142Z
    refs:
      - task/To do/agent.MOVE_TASK_TO_DOING
      - task/In progress/agent.MOVE_TASK_TO_DOING
      - task/Taken by the agent
      - task/Done/agent.MOVE_TASK_TO_DOING
      - requirements/rules#task
      - requirements/rules#task/Taken by the agent
      - requirements/data#task
  e0iua7jy:
    title: Execution check liveness
    proposal: kv1x3wmx
    tag: omp ACP IPC
    finished: 2026-10-24T15:08:22.459Z
    refs:
      - time
      - requirements/tech#time
      - requirements/rules#time
      - requirements/rules#agent.CHECK_TASK
      - requirements/quality#agent-terminal
      - requirements/data#drift-resolution
  d2ncpr0z:
    title: Safe announcement file writes
    proposal: kv1x3wmx
    tag: omp ACP IPC
    finished: 2026-10-24T14:54:31.026Z
    refs:
      - requirements/tech#announcement
      - requirements/data#announcement
---
# Safe liveness and task holders

Announcement files are written through a temporary file under a lock so no change is lost; the execution check registers process start times, asks the windows who follows each holder and no longer polls omp Chat; a Task taken by the agent always belongs to a recognised terminal or conversation.
