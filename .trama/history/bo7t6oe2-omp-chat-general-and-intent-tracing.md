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
---
# omp Chat General and Intent Tracing

General is a conversation of omp Chat kept by the host, with its own process, queue, Clear General and Install omp; it follows the Steer or Queue switch. General gives omp the general instruction in the system prompt; if omp refuses that option, the host puts the same text in the first prompt of each new session and does not repeat it when a session is resumed. A message that did not start returns to the field. Intent Tracing is set per omp Chat conversation with trama.ompChatIntentTracing, and the terminal title keeps its plain form when it is off. Implemented by Tasks ropjmjhs and the earlier ones listed here.
