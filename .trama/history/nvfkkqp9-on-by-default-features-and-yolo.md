---
created: 2026-10-25T07:12:01.004Z
updated: 2026-10-25T07:12:01.004Z
summary: Advisor Scanner, Parallel Execution, Async Drift Resolver, Sub-agents Context Sharing and Auto-update Stale Proposals are on by default, and omp Chat approval defaults to yolo with a one-time notice.
tasks:
  - zgejeg40
  - zt07elkd
cleared:
  zt07elkd:
    title: Optional features on by default
    proposal: uw6vjpry
    tag: Advanced defaults
    finished: 2026-10-25T07:08:57.218Z
    refs:
      - agent-launching
      - task
      - drift
      - drift-resolution
      - raffinamento
      - proposal
      - panel/Settings
      - requirements/tech#panel/Settings
      - requirements/ui#panel/Settings
      - requirements/ui#agent-launching
      - requirements/rules#agent-launching
      - requirements/quality#agent-launching
      - requirements/rules#work
      - requirements/rules#drift-resolution
      - requirements/tech#drift-resolution
      - requirements/ui#drift-resolution
      - requirements/quality#drift-resolution
      - requirements/rules#raffinamento
      - requirements/tech#raffinamento
      - requirements/ui#raffinamento
      - requirements/tech#developer.CHANGE_SETTING
  zgejeg40:
    title: yolo default with notice
    proposal: uw6vjpry
    tag: Advanced defaults
    finished: 2026-10-25T06:45:15.275Z
    refs:
      - omp-chat-conversation
      - requirements/rules#omp-chat-conversation
      - requirements/ui#omp-chat-conversation
      - requirements/quality#omp-chat-conversation
      - requirements/tech#omp-chat
      - requirements/tech#omp-chat-conversation/Agent running
---
# On-by-default features and yolo

The five optional features read on unless the user setting is false. omp Chat's approval defaults to yolo; a developer who never chose one is told once, with an Open Settings button.
