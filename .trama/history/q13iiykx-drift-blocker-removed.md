---
created: 2026-10-25T07:12:00.882Z
updated: 2026-10-25T07:12:00.882Z
summary: "Every Drift now blocks Tasks by the normal rule: no freed-Task lists, no non-blocking resolutions, no Drift Blocker setting or instruction sentence."
tasks:
  - 0cotfshx
  - 4zb207yi
  - f85epvma
  - ij7p92c8
cleared:
  f85epvma:
    title: Drop non-blocking resolutions
    proposal: t72q0waa
    tag: Drift Blocker removal
    finished: 2026-10-25T06:47:05.010Z
    refs:
      - proposal
      - requirements/data#proposal
      - drift-resolution/Unifying
      - requirements/rules#drift-resolution
      - requirements/tech#drift-resolution
      - requirements/ui#drift-resolution
      - requirements/rules#developer.UNIFY_DRIFTS
  0cotfshx:
    title: Drop freed Tasks from Drifts
    proposal: t72q0waa
    tag: Drift Blocker removal
    finished: 2026-10-25T06:43:07.997Z
    refs:
      - drift
      - drift/Open/agent.UNIFY_DRIFTS
      - requirements/rules#drift
      - requirements/rules#task
      - requirements/rules#agent.UNIFY_DRIFTS
      - requirements/data#drift
      - requirements/tech#drift
      - requirements/ui#drift
      - requirements/cli#General
  ij7p92c8:
    title: Remove Drift Blocker setting
    proposal: t72q0waa
    tag: Drift Blocker removal
    finished: 2026-10-25T06:40:58.838Z
    refs:
      - panel/Board
      - panel/Settings
      - requirements/ui#panel/Settings
      - requirements/tech#panel/Settings
      - requirements/rules#setup-wizard
      - requirements/ui#setup-wizard
  4zb207yi:
    title: Drop Drift Blocker sentence
    proposal: t72q0waa
    tag: Drift Blocker removal
    finished: 2026-10-25T06:38:34.903Z
    refs:
      - agent-terminal
      - requirements/rules#agent-terminal
      - requirements/quality#agent-terminal
      - requirements/rules#developer.ASK_MORE
      - requirements/ui#developer.ASK_MORE
      - requirements/rules#omp-chat-general
      - requirements/rules#agent-launching
      - requirements/quality#agent-launching
      - requirements/tech#agent-launching
      - requirements/tech#agent
      - requirements/tech#task
      - requirements/rules#work
---
# Drift Blocker removed

The Drift Blocker is gone from the core (blocking, unify, comparisons, Proposals), from the instructions Trama sends to agents, and from the editor (setting, Settings tab, wizard, Board and diagram details). Old files with `notBlocking` or `nonBlocking` are still read and the fields ignored.
