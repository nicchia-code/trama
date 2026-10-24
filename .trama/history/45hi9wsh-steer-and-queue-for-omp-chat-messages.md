---
created: 2026-10-24T11:23:02.528Z
updated: 2026-10-24T11:23:02.528Z
summary: omp Chat has a Steer or Queue switch next to Send that decides how a message sent while the agent works is delivered; a message omp refuses shows Not delivered.
tasks:
  - b9hy68uh
cleared:
  b9hy68uh:
    title: Steer e Queue
    proposal: srkyrbvl
    tag: Chat & panel polish
    finished: 2026-10-24T10:45:47.957Z
    refs:
      - omp-chat-conversation
      - requirements/ui#omp-chat-conversation
      - requirements/rules#omp-chat-conversation
      - requirements/tech#omp-chat-conversation
      - requirements/data#omp-chat
      - requirements/tech#omp-chat
---
# Steer and Queue for omp Chat messages

Every omp Chat conversation, General included, has a Steer or Queue switch next to Send. The choice is shared by all conversations of a window, kept across reloads, and starts on Steer. While the agent works, Steer sends the message as a steering message and Queue sends it as a follow-up for the end of the turn. The host keeps queued messages in memory only, holds them while a permission request waits, and sends each one right after the answer. The view shows Queued until omp shows the message, and Not delivered with the reason when omp refuses it. Stop and closing the conversation drop the messages the host still holds. Implemented by Task b9hy68uh. The live behaviour on omp is not yet checked; see the open UAT rows in docs/uat.md.
