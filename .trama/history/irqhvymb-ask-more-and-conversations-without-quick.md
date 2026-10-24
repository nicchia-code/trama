---
created: 2026-10-24T06:03:39.072Z
updated: 2026-10-24T06:03:39.072Z
summary: Ask more runs without the Quick terminal; omp Chat conversations open only for jobs and Ask more.
tasks:
  - p3zcrvmt
  - ua8c2gk3
cleared:
  ua8c2gk3:
    title: Conversazioni di omp Chat senza Quick
    proposal: rqs3fipe
    tag: Chat General
    finished: 2026-10-24T06:01:07.716Z
    refs:
      - omp-chat-conversation
      - developer.CLOSE_CHAT_CONVERSATION
      - requirements/rules#omp-chat-conversation
      - requirements/tech#omp-chat-conversation
      - requirements/data#omp-chat-conversation
  p3zcrvmt:
    title: Ask more senza il Quick terminal
    proposal: rqs3fipe
    tag: Chat General
    finished: 2026-10-24T05:47:41.735Z
    refs:
      - agent-terminal
      - announcement
      - agent-hook
      - agent-launching
      - requirements/rules#agent-terminal
      - requirements/tech#agent-terminal
      - requirements/tech#agent-launching
      - requirements/rules#developer.ASK_MORE
      - requirements/tech#developer.ASK_MORE
      - requirements/ui#developer.ASK_MORE
      - requirements/ui#announcement
---
# Ask more and conversations without Quick

Ask more opens its own terminal or conversation with no Quick terminal. omp Chat conversations open for design, scan, Run, Resolve Drifts, Unify Drifts, import and Ask more; a failed start falls back to the omp terminal with its notice.
