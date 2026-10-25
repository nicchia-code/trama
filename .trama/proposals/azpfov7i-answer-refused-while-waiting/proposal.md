---
status: discarded
base:
  agent-launching/drift-resolution.md: 417fd0208d9b03dd1dafc669d47261ce525e8bc648623488cd89e9f559a77d04
  requirements/rules/drift-resolution.md: ca5a1b2a8e0964c3cc47e6a201954a3d0a7752843b3b6fa5a7338eeda602fdd7
delete: []
created: 2026-10-24T20:08:53.588Z
---
# Answer refused while waiting

Describes the current behaviour behind Drift cpu5lyjc: when the answer to a prepared question needs the resolution agent and another resolution not born from a prepared question is a Draft or open, the agent launch is refused like any Resolve, the answer is discarded, nothing is written and the Drift stays open with its prepared question.

Decisions taken by the agent without an interview (to check):
- The refusal shows the same error as Resolve, naming the oldest waiting resolution.
- Only the Answering a prepared question transitions and the matching rule change; nothing else.
