---
status: discarded
base:
  agent-launching/omp-chat-conversation.md: 2fb7ed535eabc689d99aa2bcba58812fa968f940537de3096d55bc217a1d91b8
  requirements/rules/omp-chat.md: 7b84bcf014a473b928bc95af8d79dae9678e4718a40af4083709b9e3452b4c63
delete: []
created: 2026-10-24T20:09:05.529Z
label: omp-chat-hookless-resume
---
# Hook-less job resumes idle

Choices for the Drift kzs0i9e0: how a job conversation without Trama's hook comes back after the window closed while its agent was working. Written as a Draft for the prepared question; the resolution writes the changes.

The Model and the Requirements say what the code does: only a job conversation with Trama's hook comes back in Agent running with the fixed continuation message; a job conversation without the hook comes back at rest, with no message, and its Run stays in progress until the developer closes the conversation or its process ends.
