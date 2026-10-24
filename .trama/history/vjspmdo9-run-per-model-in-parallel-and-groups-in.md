---
created: 2026-10-24T09:10:24.012Z
updated: 2026-10-24T09:10:24.012Z
summary: Run sequences start per model in parallel with shares of the limit; the trama-implement skill plans groups and hands them to sub-agents.
tasks:
  - wd8neny4
  - 4fm7wr1w
  - tbdpxuij
cleared:
  tbdpxuij:
    title: Run per modello in parallelo
    proposal: 9l43viwa
    tag: Run in parallelo
    finished: 2026-10-24T09:00:54.551Z
    refs:
      - task
      - drift-resolution/Running tasks
      - drift-resolution/Free/developer.ASK_AGENT
      - requirements/rules#drift-resolution/Running tasks
      - requirements/rules#agent-launching
      - requirements/tech#agent-launching
  4fm7wr1w:
    title: Gruppi nella skill
    proposal: ppwmswz5
    tag: Gruppi
    finished: 2026-10-24T08:59:08.286Z
    refs:
      - task
      - requirements/rules#agent-launching
      - requirements/tech#agent
  wd8neny4:
    title: Skill usa trama-implementer
    proposal: 6wf3grcz
    tag: Sotto-agente Task
    finished: 2026-10-24T08:57:00.684Z
    refs:
      - requirements/rules#agent-launching
      - requirements/tech#task
---
# Run per model in parallel and groups in the skill

Done in this run:
- Skill sub-agent step: the trama-implementer launch and the instruction carry the Task text already read (wd8neny4).
- Skill Parallel execution: grouped task list calls with groups true, group splitting and merging, Revise and Conflicts points (4fm7wr1w).
- Run per model in parallel: the host divides the limit by runnable Tasks per model and starts the Runs together; one Run ending abnormally stops only its unstarted groups (tbdpxuij).

Not done: the conflict recording of a sub-agent stopped by a file claim (q31mg7fb) stays In progress on Drift 3qayh3mn, which asks how a multi-Task Run sub-agent names its Task. The installed trama CLI does not accept groups in task list until rebuilt; the source does.
