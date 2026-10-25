---
created: 2026-10-24T14:06:35.618Z
updated: 2026-10-24T14:06:35.618Z
summary: A To do Task can be deleted for good from the CLI, the Task details dialog and, on explicit request, by agents.
tasks:
  - c3f44iem
  - t3p1zn3e
  - w3rdu2g3
cleared:
  t3p1zn3e:
    title: Delete nei dettagli del Task
    proposal: zy1af39m
    tag: Cancella Task
    finished: 2026-10-24T14:05:26.283Z
    refs:
      - panel
      - requirements/ui#developer.DELETE_TASK
      - requirements/ui#developer.ASK_MORE
      - requirements/tech#panel
      - requirements/rules#panel/Board
  w3rdu2g3:
    title: "Skill: cancellare un Task"
    proposal: zy1af39m
    tag: Cancella Task
    finished: 2026-10-24T13:59:31.926Z
    refs:
      - agent
      - requirements/rules#General
  c3f44iem:
    title: Cancellazione Task nel core
    proposal: zy1af39m
    tag: Cancella Task
    finished: 2026-10-24T13:58:50.749Z
    refs:
      - task
      - developer.DELETE_TASK
      - requirements/rules#developer.DELETE_TASK
      - requirements/rules#developer.CLEAR_DONE
      - requirements/tech#developer.DELETE_TASK
      - requirements/tech#developer.CLEAR_DONE
      - requirements/data#developer.DELETE_TASK
      - requirements/cli#General
---
# Delete a Task in To do

deleteTask in src/core checks that the Task is in To do and not held by a Drift, and removes its files. trama task delete exposes it, the Task details dialog gets a confirmed Delete button, and the skills list deletion among the developer decisions an agent runs only when explicitly asked.
