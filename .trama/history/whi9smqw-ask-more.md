---
created: 2026-10-23T10:20:07.633Z
updated: 2026-10-24T11:22:52.327Z
summary: Ask more opens an empty omp Chat conversation on a Proposal, Task, Drift or round question; nothing reaches the agent until the developer writes the first message.
tasks:
  - j6tlxyad
  - s7rkxe5c
  - vbvnrojj
  - jke5wsit
---
# Ask more

Ask more on a Proposal, Task, Drift or round question opens a new omp Chat conversation with the chosen agent, named Ask <short number> or Ask question, and focuses its message field. Nothing is sent when it opens: the first message the developer writes goes out once, with the card or question, its links, Trama's read commands and the text. Until then the field shows a placeholder such as 'Ask about the Task…' and Send stays disabled while omp starts. With omp Chat off, Ask more still starts its instruction in the terminal at once. The chat explains and changes cards only on request; the round of questions stays unchanged. Implemented by Task jke5wsit.
