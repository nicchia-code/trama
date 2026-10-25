---
created: 2026-10-24T16:44:14.397Z
updated: 2026-10-24T16:44:14.397Z
summary: The subscription usage bar appears under the message field of every omp Chat conversation, with the provider of that conversation's model, from one report per window.
tasks:
  - pochz2mv
cleared:
  pochz2mv:
    title: Uso in ogni conversazione
    proposal: oic1xvs8
    tag: uso omp Chat
    finished: 2026-10-24T16:37:55.356Z
    refs:
      - omp-chat
      - omp-chat-general
      - requirements/rules#omp-chat
      - requirements/tech#omp-chat
      - requirements/ui#omp-chat
      - requirements/data#omp-chat
      - requirements/quality#omp-chat
      - requirements/rules#omp-chat-general
      - requirements/tech#omp-chat-general
      - requirements/ui#omp-chat-general
      - requirements/quality#omp-chat-conversation
      - requirements/data#omp-chat-general
---
# Usage bar in every conversation

General, job conversations and Ask more show the same usage bar beside the model selector, each for the provider of its own model. The window keeps one report; omp is asked when a tab appears and no report exists, at the end of a turn at most once a minute, and always when the usage dialog opens. A window without General but with job conversations asks too, in the same folder General uses.
