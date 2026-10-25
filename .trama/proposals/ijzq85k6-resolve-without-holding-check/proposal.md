---
status: discarded
base:
  agent-launching/drift-resolution.md: 417fd0208d9b03dd1dafc669d47261ce525e8bc648623488cd89e9f559a77d04
  requirements/rules/drift-resolution.md: ca5a1b2a8e0964c3cc47e6a201954a3d0a7752843b3b6fa5a7338eeda602fdd7
delete: []
created: 2026-10-24T20:08:54.864Z
---
# Resolve without holding check

Describes the current behaviour behind Drift fa0pu7pg: Resolve, with or without a prepared question, and the agent launched from an answer do not check whether the Drift is part of a resolution that is a Draft or open; only Rework with feedback refuses a Drift held by a resolution.

Decisions taken by the agent without an interview (to check):
- The condition "outside every resolution" is dropped from the two Resolve transitions of Free and from the refusals of Resolve with a prepared question; Rework with feedback keeps it.
- Nothing else changes.
