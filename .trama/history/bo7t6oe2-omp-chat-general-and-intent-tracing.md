---
created: 2026-10-24T06:03:38.894Z
updated: 2026-10-24T11:22:52.502Z
summary: omp Chat has a General conversation kept by the host, which gets a Trama instruction at the start of each session, and Intent Tracing per conversation; a message that fails to start returns to the field.
tasks:
  - b7e3zlpy
  - ejgy10qv
  - fprh76h3
  - rz36fbo2
  - ropjmjhs
cleared:
  ropjmjhs:
    title: Istruzione di General
    proposal: srkyrbvl
    tag: Chat & panel polish
    finished: 2026-10-24T11:00:49.439Z
    refs:
      - omp-chat-general
      - requirements/ui#omp-chat-general
      - requirements/rules#omp-chat-general
      - requirements/tech#omp-chat-general
      - requirements/data#omp-chat-general
  rz36fbo2:
    title: Conversazione General nell'host
    proposal: rqs3fipe
    tag: Chat General
    finished: 2026-10-24T06:10:27.099Z
    refs:
      - omp-chat-general
      - omp-acp
      - developer.CLEAR_GENERAL
      - developer.SEND_CHAT_MESSAGE
      - developer.INSTALL_OMP
      - requirements/rules#omp-chat-general
      - requirements/tech#omp-chat-general
      - requirements/data#omp-chat-general
      - requirements/quality#omp-chat-conversation
  fprh76h3:
    title: Vista omp Chat con General
    proposal: rqs3fipe
    tag: Chat General
    finished: 2026-10-23T21:07:20.445Z
    refs:
      - omp-chat
      - requirements/rules#omp-chat
      - requirements/tech#omp-chat
      - requirements/ui#omp-chat
      - requirements/ui#omp-chat-general
  b7e3zlpy:
    title: Intent Tracing nelle conversazioni
    proposal: 3uzj1g3z
    tag: Intent Tracing
    finished: 2026-10-23T20:57:18.890Z
    refs:
      - omp-chat-conversation
      - requirements/rules#omp-chat-conversation
      - requirements/tech#omp-chat-conversation
      - requirements/data#omp-chat-conversation
      - requirements/quality#omp-chat-conversation
  ejgy10qv:
    title: Impostazione omp Chat Intent Tracing
    proposal: 3uzj1g3z
    tag: Intent Tracing
    finished: 2026-10-23T20:52:48.546Z
    refs:
      - panel/Settings
      - panel/Closed/developer.SHOW_SETTINGS
      - panel/Open/developer.SHOW_SETTINGS
      - panel/Closed/developer.OPEN_GUIDED_SETUP
      - panel/Open/developer.OPEN_GUIDED_SETUP
      - requirements/tech#omp-chat
      - requirements/ui#panel/Settings
      - requirements/rules#setup-wizard
---
# omp Chat General and Intent Tracing

General is a conversation of omp Chat kept by the host, with its own process, queue, Clear General and Install omp; it follows the Steer or Queue switch. General gives omp the general instruction in the system prompt; if omp refuses that option, the host puts the same text in the first prompt of each new session and does not repeat it when a session is resumed. A message that did not start returns to the field. Intent Tracing is set per omp Chat conversation with trama.ompChatIntentTracing, and the terminal title keeps its plain form when it is off. Implemented by Tasks ropjmjhs and the earlier ones listed here.
